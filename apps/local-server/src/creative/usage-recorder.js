import fs from 'node:fs';
import path from 'node:path';

// Conservative estimated pricing in USD per 1M tokens
export const MODEL_PRICING_PER_MILLION = {
  'gpt-6.1-sol': { input: 2.00, output: 10.00 },
  'gpt-6-luna': { input: 0.10, output: 0.50 },
  'gpt-6-astra': { input: 10.00, output: 50.00 },
  'default': { input: 10.00, output: 50.00 }
};

export const DEFAULT_BUDGET_CAP_USD = 1.00;

export class AiUsageRecorder {
  constructor(storageRoot) {
    this.storageRoot = storageRoot;
    this._pendingSpend = new Map();
  }

  _getUsageFilePath(projectId) {
    const safeId = path.basename(projectId);
    return path.join(this.storageRoot, 'projects', safeId, 'creative-usage.json');
  }

  _readProjectUsage(projectId) {
    const filePath = this._getUsageFilePath(projectId);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (_) {}
    }
    return {
      projectId,
      budgetCapUsd: DEFAULT_BUDGET_CAP_USD,
      totalSpentUsd: 0,
      totalCalls: 0,
      totalTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      receipts: []
    };
  }

  _writeProjectUsage(projectId, data) {
    const filePath = this._getUsageFilePath(projectId);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  calculateCost(model, inputTokens = 0, outputTokens = 0) {
    const rates = MODEL_PRICING_PER_MILLION[model] || MODEL_PRICING_PER_MILLION['default'];
    const inputCost = (inputTokens / 1_000_000) * rates.input;
    const outputCost = (outputTokens / 1_000_000) * rates.output;
    return Number((inputCost + outputCost).toFixed(6));
  }

  estimateCost(model, expectedInputTokens = 1500, expectedOutputTokens = 1000) {
    return this.calculateCost(model, expectedInputTokens, expectedOutputTokens);
  }

  checkBudget(projectId, estimatedCostUsd = 0.05) {
    const current = this._readProjectUsage(projectId);
    const pending = this._pendingSpend.get(projectId) || 0;
    const newTotal = current.totalSpentUsd + pending + Math.max(0, estimatedCostUsd);
    if (newTotal > current.budgetCapUsd) {
      const remaining = Math.max(0, current.budgetCapUsd - (current.totalSpentUsd + pending));
      throw new Error(
        `AI spend limit reached for project '${projectId}'. ` +
        `Current spend: $${current.totalSpentUsd.toFixed(4)}, In-flight reserved: $${pending.toFixed(4)}, ` +
        `Budget cap: $${current.budgetCapUsd.toFixed(2)}, Remaining: $${remaining.toFixed(4)}. Please approve a higher spend budget to proceed.`
      );
    }
    return {
      allowed: true,
      currentSpendUsd: current.totalSpentUsd,
      pendingSpendUsd: pending,
      budgetCapUsd: current.budgetCapUsd,
      remainingBudgetUsd: Number((current.budgetCapUsd - (current.totalSpentUsd + pending)).toFixed(4))
    };
  }

  reserveBudget(projectId, estimatedCostUsd = 0.05) {
    this.checkBudget(projectId, estimatedCostUsd);
    const currentPending = this._pendingSpend.get(projectId) || 0;
    const amount = Math.max(0, estimatedCostUsd);
    this._pendingSpend.set(projectId, currentPending + amount);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const current = this._pendingSpend.get(projectId) || 0;
      const updated = Math.max(0, current - amount);
      if (updated === 0) {
        this._pendingSpend.delete(projectId);
      } else {
        this._pendingSpend.set(projectId, updated);
      }
    };
  }

  recordCall(projectId, {
    task,
    model,
    inputTokens = 0,
    outputTokens = 0,
    totalTokens = 0,
    cached = false,
    durationMs = 0,
    usageBasis = 'provider_reported'
  }) {
    const current = this._readProjectUsage(projectId);
    const costUsd = cached ? 0 : this.calculateCost(model, inputTokens, outputTokens);

    const receipt = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      task,
      model,
      inputTokens,
      outputTokens,
      totalTokens: totalTokens || (inputTokens + outputTokens),
      costUsd,
      cached,
      usageBasis,
      durationMs
    };

    current.receipts.push(receipt);
    if (current.receipts.length > 500) current.receipts = current.receipts.slice(-500);
    current.totalSpentUsd = Number((current.totalSpentUsd + costUsd).toFixed(6));
    if (!cached) current.totalCalls += 1;
    current.totalTokens += receipt.totalTokens;
    current.totalInputTokens += inputTokens;
    current.totalOutputTokens += outputTokens;

    this._writeProjectUsage(projectId, current);

    return {
      receipt,
      totalSpentUsd: current.totalSpentUsd,
      remainingBudgetUsd: Number((current.budgetCapUsd - current.totalSpentUsd).toFixed(4))
    };
  }

  recordCacheHit(projectId, { task, model, durationMs = 0 }) {
    const current = this._readProjectUsage(projectId);
    const receipt = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      task,
      model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      cached: true,
      usageBasis: 'local_cache',
      durationMs
    };
    current.receipts.push(receipt);
    if (current.receipts.length > 500) current.receipts = current.receipts.slice(-500);
    this._writeProjectUsage(projectId, current);
    return { receipt, totalSpentUsd: current.totalSpentUsd, remainingBudgetUsd: Math.max(0, current.budgetCapUsd - current.totalSpentUsd) };
  }

  getUsage(projectId) {
    const usage = this._readProjectUsage(projectId);
    return {
      ...usage,
      remainingBudgetUsd: Number(Math.max(0, usage.budgetCapUsd - usage.totalSpentUsd).toFixed(4)),
      isOverBudget: usage.totalSpentUsd >= usage.budgetCapUsd
    };
  }

  setBudget(projectId, budgetCapUsd) {
    if (typeof budgetCapUsd !== 'number' || !Number.isFinite(budgetCapUsd) || budgetCapUsd <= 0 || budgetCapUsd > 100) {
      throw new Error('Budget cap must be between $0.01 and $100.00 USD.');
    }
    const current = this._readProjectUsage(projectId);
    current.budgetCapUsd = Number(budgetCapUsd.toFixed(2));
    this._writeProjectUsage(projectId, current);
    return this.getUsage(projectId);
  }
}

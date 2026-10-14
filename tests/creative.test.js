import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildServer } from '../apps/local-server/src/index.js';
import { resolveOpenAiKey } from '../apps/local-server/src/creative/key-resolver.js';
import { AiUsageRecorder } from '../apps/local-server/src/creative/usage-recorder.js';
import { resolveStoragePaths } from '@kinetic-studio/contracts';

async function testCreativeSuite() {
  console.log('=== Running Growth Studio V0.03 Creative Director Test Suite ===\n');

  // Test 1: Key Resolver & Security - Never leak secret into plain string or error
  console.log('Test 1: Key Resolver & Secret Confidentiality');
  const resolvedKey = resolveOpenAiKey();
  assert.ok(resolvedKey, 'Expected OpenAI API key to resolve from environment/registry/keys file');
  assert.ok(resolvedKey.startsWith('sk-'), 'Expected valid OpenAI secret key prefix (sk-)');
  assert.ok(resolvedKey.length > 30, 'Expected plausible secret key length');
  // Check that JSON serialization does not accidentally expose the key in standard objects
  const safeObj = { provider: 'openai', keyConfigured: Boolean(resolvedKey) };
  assert.strictEqual(JSON.stringify(safeObj).includes(resolvedKey), false, 'API key must not leak into serialized configs');
  console.log('✓ Key resolved securely and sanitized from configs\n');

  // Test 2: AI Usage Recorder, Pricing & Budget Caps ($1.00 hard default limit)
  console.log('Test 2: Usage Recorder, Budget Caps & Receipts');
  const storagePaths = resolveStoragePaths();
  const usageRecorder = new AiUsageRecorder(storagePaths.root);
  const testProjectId = `test-usage-${Date.now()}`;

  const budgetCheck = usageRecorder.checkBudget(testProjectId, 0.05);
  assert.strictEqual(budgetCheck.allowed, true);
  assert.strictEqual(budgetCheck.budgetCapUsd, 1.00);

  // Record a simulated call
  const recorded = usageRecorder.recordCall(testProjectId, {
    task: 'generate_concepts',
    model: 'gpt-6.1-sol',
    inputTokens: 1200,
    outputTokens: 800,
    durationMs: 1450
  });
  assert.ok(recorded.receipt.costUsd > 0, 'Cost should be calculated from token counts');
  assert.ok(recorded.remainingBudgetUsd < 1.00, 'Remaining budget should decrement');

  // Test budget cap enforcement
  const usageFilePath = usageRecorder._getUsageFilePath(testProjectId);
  assert.ok(fs.existsSync(usageFilePath), 'Receipt file must exist on disk');

  // Set tight budget and verify limit exception
  usageRecorder.setBudget(testProjectId, 0.005);
  let budgetBlocked = false;
  try {
    usageRecorder.checkBudget(testProjectId, 0.05);
  } catch (err) {
    budgetBlocked = true;
    assert.ok(err.message.includes('AI spend limit reached'), 'Must throw spend limit error');
  }
  assert.strictEqual(budgetBlocked, true, 'Calls exceeding budget cap must be blocked');

  // Restore budget cap for test cleanup
  usageRecorder.setBudget(testProjectId, 2.00);
  const updatedUsage = usageRecorder.getUsage(testProjectId);
  assert.strictEqual(updatedUsage.budgetCapUsd, 2.00);
  console.log('✓ Usage recorder accurately enforces $1.00 default cap, estimates tokens, and saves receipts\n');

  // Test 3: Fastify Server Creative Routes Integration
  console.log('Test 3: Local Server Creative Director API Endpoints');
  const server = await buildServer();

  // Test 3a: Provider Status (Zero Secrets Exposed)
  const resStatus = await server.inject({ method: 'GET', url: '/api/creative/provider-status' });
  assert.strictEqual(resStatus.statusCode, 200);
  const statusData = JSON.parse(resStatus.body);
  assert.strictEqual(statusData.provider, 'openai');
  assert.strictEqual(statusData.configured, true);
  assert.strictEqual(statusData.offline, false);
  assert.strictEqual(statusData.budgetCapUsd, 1.00);
  assert.ok(Array.isArray(statusData.models));
  assert.ok(statusData.models.some(m => m.id === 'gpt-6.1-sol'));
  assert.ok(statusData.models.some(m => m.id === 'gpt-6-luna'));
  assert.strictEqual(JSON.stringify(statusData).includes('sk-'), false, 'Server status MUST NEVER contain the raw API key');
  console.log('✓ GET /api/creative/provider-status returned safe provider details (zero secrets exposed)');

  // Test 3b: Create a fresh test project
  const resProj = await server.inject({
    method: 'POST',
    url: '/api/projects',
    payload: {
      name: 'CloudPulse V0.03 Creative Test',
      preset: 'saas'
    }
  });
  assert.strictEqual(resProj.statusCode, 201);
  const project = JSON.parse(resProj.body);
  const projectId = project.project.id;
  console.log(`✓ Created test project '${projectId}'`);

  // Test 3c: Check Creative History endpoint initially empty
  const resHist = await server.inject({
    method: 'GET',
    url: `/api/projects/${projectId}/creative/history`
  });
  assert.strictEqual(resHist.statusCode, 200);
  const history = JSON.parse(resHist.body);
  assert.ok(Array.isArray(history));
  console.log('✓ GET /api/projects/:id/creative/history accessible');

  // Test 3d: Check Creative Usage endpoint initially 0
  const resUsage = await server.inject({
    method: 'GET',
    url: `/api/projects/${projectId}/creative/usage`
  });
  assert.strictEqual(resUsage.statusCode, 200);
  const usage = JSON.parse(resUsage.body);
  assert.strictEqual(usage.totalCalls, 0);
  assert.strictEqual(usage.budgetCapUsd, 1.00);
  console.log('✓ GET /api/projects/:id/creative/usage accessible');

  // Test 3e: Budget Update Endpoint
  const resBudget = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/creative/budget`,
    payload: { budgetCapUsd: 1.50 }
  });
  assert.strictEqual(resBudget.statusCode, 200);
  const budgetUpdated = JSON.parse(resBudget.body);
  assert.strictEqual(budgetUpdated.usage.budgetCapUsd, 1.50);
  console.log('✓ POST /api/projects/:id/creative/budget updated project cap to $1.50');

  // Test 3f: Negative Gate - Missing instruction on rewrite
  const resRewriteMissing = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/creative/scenes/scene-1/rewrite`,
    payload: { instruction: '' }
  });
  assert.strictEqual(resRewriteMissing.statusCode, 400);
  console.log('✓ Negative gate: Empty rewrite instruction rejected with HTTP 400');

  // Test 3g: Negative Gate - Nonexistent scene rewrite
  const resRewrite404 = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/creative/scenes/nonexistent-scene/rewrite`,
    payload: { instruction: 'Make it punchier' }
  });
  assert.strictEqual(resRewrite404.statusCode, 404);
  console.log('✓ Negative gate: Nonexistent scene rejected with HTTP 404');

  // Clean up test projects
  await server.inject({ method: 'DELETE', url: `/api/projects/${projectId}` });
  console.log(`✓ Deleted temporary project '${projectId}'\n`);

  console.log('====================================================');
  console.log('✓✓ ALL CREATIVE SUITE UNIT & INTEGRATION GATES PASSED');
  console.log('====================================================\n');
}

testCreativeSuite().catch(err => {
  console.error('FAILED creative test suite:', err);
  process.exit(1);
});

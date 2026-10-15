import React, { useState, useEffect } from 'react';
import { Project, CreativeUsage } from '../types';
import { fetchCreativeUsage, updateCreativeBudget } from '../api';
import {
  DollarSign,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface AiUsageModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const AiUsageModal: React.FC<AiUsageModalProps> = ({
  project,
  isOpen,
  onClose
}) => {
  const [usage, setUsage] = useState<CreativeUsage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newBudgetCap, setNewBudgetCap] = useState<string>('1.00');
  const [isUpdatingBudget, setIsUpdatingBudget] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadUsage = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCreativeUsage(project.project.id);
      setUsage(data);
      setNewBudgetCap(data.budgetCapUsd.toFixed(2));
    } catch (err: any) {
      console.error('Failed to load usage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsage();
    }
  }, [isOpen, project.project.id]);

  if (!isOpen) return null;

  const handleUpdateBudget = async () => {
    const parsed = parseFloat(newBudgetCap);
    if (isNaN(parsed) || parsed <= 0) {
      setStatusMessage('Please enter a valid positive number for budget cap');
      return;
    }

    setIsUpdatingBudget(true);
    setStatusMessage(null);
    try {
      const res = await updateCreativeBudget(project.project.id, parsed);
      if (res.success && res.usage) {
        setUsage(res.usage);
        setStatusMessage(`Budget cap updated to $${parsed.toFixed(2)} USD ✓`);
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Spend & Token Receipts</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Request and project caps
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transparent local accounting for OpenAI Responses API calls on project '{project.project.id}'.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mx-6 mt-4 p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
            {statusMessage}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading token receipts...</div>
          ) : !usage ? (
            <div className="p-8 text-center text-slate-400 text-xs">No usage recorded.</div>
          ) : (
            <div className="space-y-6">
              
              {/* Spend Metrics Card */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Total Spent</span>
                  <div className="text-xl font-black text-amber-400 mt-1">
                    ${usage.totalSpentUsd.toFixed(4)}
                  </div>
                  <span className="text-[10px] text-slate-500">{usage.totalCalls} API calls</span>
                </div>

                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Budget Cap</span>
                  <div className="text-xl font-black text-white mt-1">
                    ${usage.budgetCapUsd.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">Per-project limit</span>
                </div>

                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Remaining Budget</span>
                  <div className={`text-xl font-black mt-1 ${usage.remainingBudgetUsd > 0.2 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${usage.remainingBudgetUsd.toFixed(4)}
                  </div>
                  <span className="text-[10px] text-slate-500">Auto-blocks when $0</span>
                </div>
              </div>

              {/* Adjust Budget Cap */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-200">Adjust Project Budget Cap:</span>
                <p className="text-[11px] text-slate-400">
                  By default, each project is limited to $1.00 USD to prevent accidental or runaway spend. You can adjust this limit here.
                </p>
                <p className="text-[11px] text-slate-500">Per-request caps: up to $0.10 for scene rewrite, $0.15 for concepts/review, and $0.20 for storyboards. Token counts use provider-reported values when available; local USD totals are estimates, not invoices.</p>
                <div className="flex items-center gap-3 pt-1">
                  <div className="relative w-36">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0.10"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white font-mono font-bold outline-none focus:border-indigo-500"
                      value={newBudgetCap}
                      onChange={(e) => setNewBudgetCap(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateBudget}
                    disabled={isUpdatingBudget}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                  >
                    {isUpdatingBudget ? 'Saving...' : 'Update Budget'}
                  </button>
                </div>
              </div>

              {/* Itemized Receipts List */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Itemized Call Receipts ({usage.receipts?.length || 0})
                </span>

                {(!usage.receipts || usage.receipts.length === 0) ? (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    No API calls made for this project yet.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {usage.receipts.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200 capitalize">
                              {rec.task.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300">
                              {rec.model}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(rec.timestamp).toLocaleTimeString()} • {rec.totalTokens} {rec.usageBasis === 'estimated_from_text' ? 'estimated' : ''} tokens ({rec.inputTokens} in / {rec.outputTokens} out) • {rec.cached ? 'cache hit' : (rec.durationMs / 1000).toFixed(1) + 's'}
                          </div>
                        </div>

                        <div className="font-mono font-bold text-amber-400 text-right">
                          ${rec.costUsd.toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Zero cloud secrets exposed</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Project, CreativeAudit, CreativeSuggestion } from '../types';
import { reviewCreativeProject } from '../api';
import {
  Sparkles,
  X,
  Check,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Award,
  Zap,
  TrendingUp,
  FileCheck
} from 'lucide-react';

interface CreativeReviewModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onApplySuggestion: (suggestion: CreativeSuggestion) => void;
  onAuditUpdated: (updatedAudit: CreativeAudit) => void;
}

export const CreativeReviewModal: React.FC<CreativeReviewModalProps> = ({
  project,
  isOpen,
  onClose,
  onApplySuggestion,
  onAuditUpdated
}) => {
  const [audit, setAudit] = useState<CreativeAudit | null>(project.creative?.creativeAudit || null);
  const [isRunningReview, setIsRunningReview] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleRunReview = async () => {
    setIsRunningReview(true);
    setErrorMessage(null);
    try {
      const res = await reviewCreativeProject(project.project.id);
      if (res.success && res.audit) {
        setAudit(res.audit);
        onAuditUpdated(res.audit);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Creative review failed');
    } finally {
      setIsRunningReview(false);
    }
  };

  const handleApply = (suggestion: CreativeSuggestion, index: number) => {
    onApplySuggestion(suggestion);
    setAppliedSuggestions(prev => new Set([...prev, `${suggestion.targetSceneId}-${index}`]));
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 5) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Creative Director Audit</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Automated Review
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Independent quality audit of hook strength, narrative pacing, factual fidelity, and mobile typography.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunReview}
              disabled={isRunningReview}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningReview ? 'animate-spin' : ''}`} />
              <span>{isRunningReview ? 'Auditing Storyboard...' : 'Run New Audit'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close audit"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Audit Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!audit ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <FileCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No Creative Audit on Record</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Click 'Run New Audit' to analyze your storyboard's hook, benefits, brand fidelity, pacing, and mobile legibility.
                </p>
              </div>
              <button
                onClick={handleRunReview}
                disabled={isRunningReview}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 mx-auto shadow-lg shadow-indigo-600/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run Creative Audit Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Score Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(audit.overallScore)}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Overall Score</span>
                  <span className="text-3xl font-black mt-1">{audit.overallScore}<span className="text-sm font-normal opacity-60">/10</span></span>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">Hook Strength</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-white">{audit.hookScore}/10</span>
                    <span className="text-[10px] text-slate-500">First 3s grab</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">Benefits Clarity</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-white">{audit.benefitsScore}/10</span>
                    <span className="text-[10px] text-slate-500">Value prop</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">Facts Grounding</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-white">{audit.factsScore}/10</span>
                    <span className="text-[10px] text-slate-500">Zero fabrication</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">Pacing & Flow</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-white">{audit.pacingScore}/10</span>
                    <span className="text-[10px] text-slate-500">Speech fit</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">Mobile Safe Text</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-white">{audit.mobileLegibilityScore}/10</span>
                    <span className="text-[10px] text-slate-500">9:16 safe</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">Language Quality</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-white">{audit.languageScore}/10</span>
                    <span className="text-[10px] text-slate-500">Grammar & style</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">Brand Consistency</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-white">{audit.brandScore}/10</span>
                    <span className="text-[10px] text-slate-500">Tone cohesion</span>
                  </div>
                </div>
              </div>

              {/* Summary note */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-xs font-bold text-slate-300 block mb-1">Director Summary</span>
                <p className="text-xs text-slate-400 leading-relaxed">{audit.summary}</p>
              </div>

              {/* Actionable Suggestions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Actionable Improvement Suggestions ({audit.suggestions?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Click 'Apply Suggestion' to update the scene headline and narration
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(audit.suggestions || []).map((sugg, idx) => {
                    const isApplied = appliedSuggestions.has(`${sugg.targetSceneId}-${idx}`);
                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start justify-between gap-4 transition hover:border-slate-700"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              sugg.severity === 'high'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : sugg.severity === 'medium'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}>
                              {sugg.severity} priority
                            </span>
                            <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                              Scene: {sugg.targetSceneId}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-medium">
                              Category: {sugg.category}
                            </span>
                          </div>

                          <div className="text-xs space-y-1 pt-1">
                            {sugg.currentText && (
                              <div className="text-slate-400 line-through text-[11px]">
                                "{sugg.currentText}"
                              </div>
                            )}
                            <div className="text-emerald-300 font-semibold text-xs">
                              "{sugg.proposedText}"
                            </div>
                            <div className="text-[11px] text-slate-400 italic">
                              Why: {sugg.rationale}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApply(sugg, idx)}
                          disabled={isApplied}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition ${
                            isApplied
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Applied</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              <span>Apply to Scene</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Target Language: {project.project?.language?.toUpperCase()}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};

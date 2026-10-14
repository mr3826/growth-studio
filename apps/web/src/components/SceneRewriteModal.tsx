import React, { useState } from 'react';
import { Project } from '../types';
import { rewriteCreativeScene } from '../api';
import {
  Sparkles,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Lock,
  Unlock,
  ArrowRight
} from 'lucide-react';

interface SceneRewriteModalProps {
  project: Project;
  sceneId: string;
  isOpen: boolean;
  onClose: () => void;
  onSceneRewritten: (updatedProject: Project) => void;
}

export const SceneRewriteModal: React.FC<SceneRewriteModalProps> = ({
  project,
  sceneId,
  isOpen,
  onClose,
  onSceneRewritten
}) => {
  const scene = (project.scenes || []).find(s => s.id === sceneId);
  const [instruction, setInstruction] = useState<string>('');
  const [model, setModel] = useState<string>('gpt-6-luna');
  const [forceUnlock, setForceUnlock] = useState<boolean>(false);
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rewrittenScene, setRewrittenScene] = useState<any | null>(null);

  if (!isOpen || !scene) return null;

  const isLocked = scene.isApproved || scene.approvalStatus === 'locked';

  const handleRewrite = async () => {
    if (!instruction.trim()) {
      setErrorMessage('Please enter an instruction for rewriting this scene.');
      return;
    }

    setIsRewriting(true);
    setErrorMessage(null);
    try {
      const res = await rewriteCreativeScene(
        project.project.id,
        sceneId,
        instruction.trim(),
        model,
        forceUnlock
      );
      if (res.success && res.scene) {
        setRewrittenScene(res.scene);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Scene rewrite failed');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleApply = () => {
    if (!rewrittenScene) return;
    const sceneIndex = (project.scenes || []).findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    const newScenes = [...project.scenes];
    newScenes[sceneIndex] = rewrittenScene;
    onSceneRewritten({ ...project, scenes: newScenes });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Rewrite Scene with AI</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {scene.id}
                </span>
                {isLocked && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Single-scene selective regeneration. All other scenes and timing remain untouched.
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

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Current Content Preview */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Scene Content:</span>
            <div className="text-sm font-bold text-white">"{scene.headline}"</div>
            {scene.narrationText && (
              <div className="text-xs text-slate-400 italic">Voice: "{scene.narrationText}"</div>
            )}
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Quick Revision Instructions:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Make the headline much punchier and shorter',
                'Emphasize 3-second response time and efficiency',
                'Rewrite in authentic urban Bengali',
                'Focus on customer frustration and urgency',
                'Strengthen Call-To-Action clarity'
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInstruction(preset)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Your Custom Revision Prompt:
            </label>
            <textarea
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
              placeholder="e.g. Highlight that manual ticket sorting costs hours of lost time every morning..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>

          {/* Model & Lock options */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Model:</label>
              <select
                className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2 py-1 outline-none"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gpt-6-luna">GPT-6 Luna (Fast Iteration ~5s)</option>
                <option value="gpt-6.1-sol">GPT-6.1 Sol (Flagship Creative)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (Budget)</option>
              </select>
            </div>

            {isLocked && (
              <label className="flex items-center gap-1.5 text-xs text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceUnlock}
                  onChange={(e) => setForceUnlock(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Force rewrite locked scene</span>
              </label>
            )}
          </div>

          {/* Rewritten Result Preview if ready */}
          {rewrittenScene && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Rewritten Draft:
                </span>
                <span className="text-[10px] font-mono text-slate-400">Duration: {rewrittenScene.durationSeconds}s</span>
              </div>
              <div className="text-sm font-bold text-emerald-300">"{rewrittenScene.headline}"</div>
              {rewrittenScene.subheadline && (
                <div className="text-xs text-slate-300">"{rewrittenScene.subheadline}"</div>
              )}
              {rewrittenScene.narrationText && (
                <div className="text-xs text-slate-400 italic">Voiceover: "{rewrittenScene.narrationText}"</div>
              )}
              <div className="text-[10px] text-slate-400">
                Entrance Motion: <span className="font-mono text-slate-300">{rewrittenScene.motion?.entrance || 'stagger_words'}</span>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
          >
            Cancel
          </button>

          {rewrittenScene ? (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept & Update Scene</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRewrite}
              disabled={isRewriting || (isLocked && !forceUnlock)}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRewriting ? 'animate-spin' : ''}`} />
              <span>{isRewriting ? 'Regenerating Scene...' : 'Rewrite Scene with AI'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Project } from '../types';
import { Smartphone, Monitor, Sparkles, Plus, Trash2, ArrowRight, ArrowLeft, Target } from 'lucide-react';

interface MotionMockupsStepProps {
  project: Project;
  onChange: (updated: Project) => void;
  onBack: () => void;
  onNext: () => void;
}

export const MotionMockupsStep: React.FC<MotionMockupsStepProps> = ({
  project,
  onChange,
  onBack,
  onNext
}) => {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const scenes = project.scenes || [];
  const currentScene = scenes[selectedSceneIndex] || scenes[0];

  const handleUpdateScene = (updates: any) => {
    const newScenes = [...scenes];
    newScenes[selectedSceneIndex] = { ...newScenes[selectedSceneIndex], ...updates };
    onChange({ ...project, scenes: newScenes });
  };

  const handleAddCallout = () => {
    const callouts = currentScene.callouts || [];
    const newCallout = {
      label: project.project.language === 'bn' ? 'স্মার্ট পয়েন্ট' : 'Highlight Feature',
      x: 0.65,
      y: 0.45,
      placement: 'left',
      delaySeconds: 0.3
    };
    handleUpdateScene({ callouts: [...callouts, newCallout] });
  };

  const handleRemoveCallout = (index: number) => {
    const callouts = (currentScene.callouts || []).filter((_, i) => i !== index);
    handleUpdateScene({ callouts });
  };

  const handleUpdateCallout = (index: number, updates: any) => {
    const callouts = [...(currentScene.callouts || [])];
    callouts[index] = { ...callouts[index], ...updates };
    handleUpdateScene({ callouts });
  };

  const availableImageAssets = (project.assets || []).filter(a => a.kind === 'image' || a.kind === 'logo');

  return (
    <div className="step-container motion-step-view">
      <div className="step-header">
        <h2 className="step-title">Step 5: Motion Presets, Device Frames & Callouts</h2>
        <p className="step-subtitle">
          Configure smartphone/browser hardware frames, camera zoom/pan, pinpoint callouts, and kinetic eases.
        </p>
      </div>

      <div className="motion-split-layout">
        {/* Left: Scene Selector */}
        <div className="scene-mini-selector">
          <label className="form-label mb-2">Select Scene</label>
          <div className="scene-mini-tabs">
            {scenes.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedSceneIndex(idx)}
                className={`scene-mini-tab ${selectedSceneIndex === idx ? 'active' : ''}`}
              >
                <span>#{idx + 1} {s.kind}</span>
                {s.deviceFrame && <span className="mini-frame-badge">{s.deviceFrame}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Controls for Selected Scene */}
        {currentScene && (
          <div className="motion-controls-card">
            <h3 className="section-title mb-4">
              Configuring Scene #{selectedSceneIndex + 1}: "{currentScene.headline?.slice(0, 40) || 'Scene'}"
            </h3>

            {/* Device Framing */}
            <div className="form-group mb-6">
              <label className="form-label">Device Mockup Frame</label>
              <div className="frame-options-row">
                <button
                  type="button"
                  onClick={() => handleUpdateScene({ deviceFrame: undefined, layout: 'centered' })}
                  className={`frame-option-btn ${!currentScene.deviceFrame ? 'active' : ''}`}
                >
                  <Sparkles className="w-5 h-5 mb-1 text-slate-400" />
                  <span>No Frame</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateScene({ deviceFrame: 'mobile', layout: 'device_mockup' })}
                  className={`frame-option-btn ${currentScene.deviceFrame === 'mobile' ? 'active' : ''}`}
                >
                  <Smartphone className="w-5 h-5 mb-1 text-emerald-400" />
                  <span>Mobile Phone</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateScene({ deviceFrame: 'browser_window', layout: 'device_mockup' })}
                  className={`frame-option-btn ${currentScene.deviceFrame === 'browser_window' ? 'active' : ''}`}
                >
                  <Monitor className="w-5 h-5 mb-1 text-sky-400" />
                  <span>Desktop Browser</span>
                </button>
              </div>
            </div>

            {/* Media Asset Binding */}
            {currentScene.deviceFrame && (
              <div className="form-group mb-6">
                <label className="form-label">Screen Image Asset</label>
                <select
                  className="form-input"
                  value={currentScene.mediaAssetIds?.[0] || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    handleUpdateScene({ mediaAssetIds: id ? [id] : [] });
                  }}
                >
                  <option value="">-- Generic Interactive Mockup (No asset required) --</option>
                  {availableImageAssets.map(a => (
                    <option key={a.id} value={a.id}>{a.id} ({a.file})</option>
                  ))}
                </select>
                <small className="text-xs text-slate-400 mt-1 block">
                  Select an imported screenshot or leave blank to display an automated vector interface.
                </small>
              </div>
            )}

            {/* Pinpoint Callouts */}
            <div className="form-group mb-6">
              <div className="flex-between mb-2">
                <label className="form-label flex items-center gap-1">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>Radar Callout Badges ({(currentScene.callouts || []).length})</span>
                </label>
                <button onClick={handleAddCallout} className="btn-secondary btn-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Callout</span>
                </button>
              </div>

              {(currentScene.callouts || []).length === 0 ? (
                <div className="p-3 text-xs text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800">
                  No callout tags on this scene. Click "Add Callout" to place a radar highlight pin.
                </div>
              ) : (
                <div className="callouts-stack">
                  {(currentScene.callouts || []).map((c, cIdx) => (
                    <div key={cIdx} className="callout-config-row">
                      <input
                        type="text"
                        className="form-input text-xs"
                        value={c.label}
                        placeholder="Tag label"
                        onChange={(e) => handleUpdateCallout(cIdx, { label: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">X:</span>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          className="form-input text-xs w-16"
                          value={c.x ?? 0.65}
                          onChange={(e) => handleUpdateCallout(cIdx, { x: parseFloat(e.target.value) })}
                        />
                        <span className="text-xs text-slate-400">Y:</span>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          className="form-input text-xs w-16"
                          value={c.y ?? 0.45}
                          onChange={(e) => handleUpdateCallout(cIdx, { y: parseFloat(e.target.value) })}
                        />
                        <button
                          onClick={() => handleRemoveCallout(cIdx)}
                          className="btn-icon delete-btn"
                          title="Remove callout"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kinetic Motion Controls */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Entrance Motion</label>
                <select
                  className="form-input"
                  value={currentScene.motion?.entrance || 'stagger_words'}
                  onChange={(e) => handleUpdateScene({
                    motion: { ...currentScene.motion, entrance: e.target.value }
                  })}
                >
                  <option value="stagger_words">Stagger Words (Kinetic)</option>
                  <option value="scale_pop">Scale Pop (Spring)</option>
                  <option value="slide_left">Slide Left</option>
                  <option value="slide_right">Slide Right</option>
                  <option value="fade_up">Fade Up</option>
                  <option value="mask_reveal">Mask Reveal</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Easing Curve</label>
                <select
                  className="form-input"
                  value={currentScene.motion?.easing || 'spring'}
                  onChange={(e) => handleUpdateScene({
                    motion: { ...currentScene.motion, easing: e.target.value }
                  })}
                >
                  <option value="spring">Spring (Dynamic bounce)</option>
                  <option value="ease_out">Smooth Ease Out</option>
                  <option value="ease_in_out">Cinematic Ease In-Out</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="step-navigation-bar">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to Brand Kit</span>
        </button>
        <button onClick={onNext} className="btn-primary">
          <span>Next: Preview & Validate</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

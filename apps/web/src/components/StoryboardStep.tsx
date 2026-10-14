import React, { useState } from 'react';
import { Project } from '../types';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  Mic,
  Play,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { generateNarration, fitScenesToAudio } from '../api';

interface StoryboardStepProps {
  project: Project;
  onChange: (updated: Project) => void;
  onBack: () => void;
  onNext: () => void;
}

export const StoryboardStep: React.FC<StoryboardStepProps> = ({
  project,
  onChange,
  onBack,
  onNext
}) => {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [isFittingAll, setIsFittingAll] = useState<boolean>(false);

  const scenes = project.scenes || [];
  const totalDuration = scenes.reduce((acc, s) => acc + (Number(s.durationSeconds) || 4), 0);

  const handleUpdateScene = (index: number, updates: any) => {
    const newScenes = [...scenes];
    newScenes[index] = { ...newScenes[index], ...updates };
    onChange({ ...project, scenes: newScenes });
  };

  const handleAddScene = () => {
    const newScene = {
      id: `scene-${Date.now().toString(36).slice(4)}`,
      chapterNumber: Math.max(1, Math.ceil((scenes.length + 1) / 2)),
      chapterTitle: project.project.language === 'bn' ? 'নতুন পর্ব' : 'Feature Story',
      kind: 'kinetic_text',
      durationSeconds: 5,
      eyebrow: project.project.language === 'bn' ? 'স্মার্ট সমাধান' : 'POWERFUL FEATURE',
      headline: project.project.language === 'bn' ? 'নতুন ফিচার দিয়ে সহজে কাজ করুন' : 'Deliver More Value With Confidence',
      subheadline: project.project.language === 'bn' ? 'দ্রুত এবং কার্যকর সমাধান।' : 'Built for maximum engagement and clarity.',
      highlightWords: [project.project.language === 'bn' ? 'সহজে' : 'Value'],
      layout: 'centered',
      motion: {
        entrance: 'stagger_words',
        emphasis: 'highlight',
        exit: 'fade',
        easing: 'spring',
        intensity: 0.8,
        staggerMilliseconds: 70
      }
    };
    const newScenes = [...scenes, newScene];
    onChange({ ...project, scenes: newScenes });
    setSelectedSceneIndex(newScenes.length - 1);
  };

  const handleDeleteScene = (index: number) => {
    if (scenes.length <= 1) {
      alert('The storyboard must contain at least one scene.');
      return;
    }
    const newScenes = scenes.filter((_, i) => i !== index);
    onChange({ ...project, scenes: newScenes });
    setSelectedSceneIndex(Math.max(0, index - 1));
  };

  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const newScenes = [...scenes];
    const temp = newScenes[index];
    newScenes[index] = newScenes[targetIndex];
    newScenes[targetIndex] = temp;

    onChange({ ...project, scenes: newScenes });
    setSelectedSceneIndex(targetIndex);
  };

  const handleDuplicateScene = (index: number) => {
    const src = scenes[index];
    const clone = {
      ...src,
      id: `scene-${Date.now().toString(36).slice(4)}`,
      headline: `${src.headline} (Copy)`
    };
    const newScenes = [...scenes];
    newScenes.splice(index + 1, 0, clone);
    onChange({ ...project, scenes: newScenes });
    setSelectedSceneIndex(index + 1);
  };

  const handleGenerateSceneVoice = async (sceneId: string) => {
    setGeneratingSceneId(sceneId);
    try {
      const res = await generateNarration(project.project.id, {
        sceneId,
        voice: project.audio?.narration?.voice || 'Puck',
        fitDuration: true
      });
      if (res.success && res.project) {
        onChange(res.project);
      }
    } catch (err: any) {
      alert(`Voice generation failed: ${err.message}`);
    } finally {
      setGeneratingSceneId(null);
    }
  };

  const handleGenerateAllVoice = async () => {
    setIsGeneratingAll(true);
    try {
      const res = await generateNarration(project.project.id, {
        allScenes: true,
        voice: project.audio?.narration?.voice || 'Puck',
        fitDuration: true
      });
      if (res.success && res.project) {
        onChange(res.project);
      }
    } catch (err: any) {
      alert(`Voice generation failed: ${err.message}`);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleFitAllScenes = async () => {
    setIsFittingAll(true);
    try {
      const res = await fitScenesToAudio(project.project.id, 0.5);
      if (res.success && res.scenes) {
        onChange({ ...project, scenes: res.scenes });
      }
    } catch (err: any) {
      alert(`Auto-fit failed: ${err.message}`);
    } finally {
      setIsFittingAll(false);
    }
  };

  const handlePlaySceneVoice = (assetId: string) => {
    const asset = (project.assets || []).find(a => a.id === assetId);
    if (!asset || !asset.file) return;
    const url = `/api/projects/${project.project.id}/${asset.file}`;
    const audio = new Audio(url);
    audio.play().catch(e => console.error('Audio play error:', e));
  };

  const currentScene = scenes[selectedSceneIndex] || scenes[0];

  return (
    <div className="step-container storyboard-step-view">
      <div className="step-header flex-between">
        <div>
          <h2 className="step-title">Step 3: Storyboard, Chapters & Typography</h2>
          <p className="step-subtitle">
            Configure narrative scenes, Bengali/English headlines, highlighted words, and durations.
          </p>
        </div>
        <div className="total-duration-badge">
          <Clock className="w-4 h-4 text-amber-400 mr-1" />
          <span>Total Timeline: <strong>{totalDuration.toFixed(1)}s</strong> ({scenes.length} scenes)</span>
        </div>
      </div>

      <div className="storyboard-split-layout">
        {/* Left: Scenes Overview List */}
        <div className="storyboard-scenes-nav">
          <div className="nav-header-row">
            <span className="font-bold text-sm text-slate-300">SCENE SEQUENCE</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={handleGenerateAllVoice}
                disabled={isGeneratingAll}
                className="btn-primary btn-xs"
                title="Generate voiceover for all scenes with Gemini TTS"
              >
                <Mic className="w-3 h-3 mr-1" />
                <span>{isGeneratingAll ? 'Generating...' : 'Voice All'}</span>
              </button>
              <button
                type="button"
                onClick={handleFitAllScenes}
                disabled={isFittingAll}
                className="btn-secondary btn-xs"
                title="Auto-fit scene durations to voice audio"
              >
                <span>{isFittingAll ? 'Fitting...' : 'Fit'}</span>
              </button>
              <button onClick={handleAddScene} className="btn-secondary btn-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="scenes-items-stack">
            {scenes.map((s, idx) => {
              const isSelected = selectedSceneIndex === idx;
              return (
                <div
                  key={s.id || idx}
                  onClick={() => setSelectedSceneIndex(idx)}
                  className={`scene-nav-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="scene-nav-top">
                    <span className="scene-nav-num">#{idx + 1}</span>
                    <span className="scene-nav-kind">{s.kind}</span>
                    <span className="scene-nav-dur">{s.durationSeconds}s</span>
                  </div>
                  <div className="scene-nav-headline">
                    {s.headline || <span className="text-slate-500 italic">No headline</span>}
                  </div>
                  {s.chapterTitle && (
                    <div className="scene-nav-chapter">
                      <Bookmark className="w-3 h-3 mr-1 opacity-70" />
                      <span>{s.chapterTitle}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Scene Editor */}
        {currentScene && (
          <div className="storyboard-editor-panel">
            <div className="editor-top-actions">
              <div className="scene-index-badge">
                Editing Scene #{selectedSceneIndex + 1} ({currentScene.id})
              </div>
              <div className="scene-btn-group">
                <button
                  onClick={() => handleMoveScene(selectedSceneIndex, 'up')}
                  disabled={selectedSceneIndex === 0}
                  className="btn-icon"
                  title="Move Up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMoveScene(selectedSceneIndex, 'down')}
                  disabled={selectedSceneIndex === scenes.length - 1}
                  className="btn-icon"
                  title="Move Down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDuplicateScene(selectedSceneIndex)}
                  className="btn-icon"
                  title="Duplicate Scene"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteScene(selectedSceneIndex)}
                  className="btn-icon delete-btn"
                  title="Delete Scene"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            </div>

            <div className="editor-grid-fields">
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Scene Archetype (Kind)</label>
                  <select
                    className="form-input"
                    value={currentScene.kind}
                    onChange={(e) => handleUpdateScene(selectedSceneIndex, { kind: e.target.value })}
                  >
                    <option value="kinetic_text">Kinetic Typography (Hook)</option>
                    <option value="problem">Problem / Challenge</option>
                    <option value="solution">Solution / Reveal</option>
                    <option value="ui_demo">UI Demo / Device Screen</option>
                    <option value="stat">Statistic Beat (Huge Number)</option>
                    <option value="feature">Key Feature / Benefit</option>
                    <option value="cta">Call to Action (Outro)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Duration (seconds): {currentScene.durationSeconds}s</label>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    step="0.5"
                    className="w-full mt-2"
                    value={currentScene.durationSeconds}
                    onChange={(e) => handleUpdateScene(selectedSceneIndex, { durationSeconds: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Chapter Number</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    className="form-input"
                    value={currentScene.chapterNumber || ''}
                    placeholder="e.g. 1"
                    onChange={(e) => handleUpdateScene(selectedSceneIndex, { chapterNumber: parseInt(e.target.value, 10) || undefined })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Chapter Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={currentScene.chapterTitle || ''}
                    placeholder="e.g. সমস্যা ও সমাধান / Smart Automation"
                    onChange={(e) => handleUpdateScene(selectedSceneIndex, { chapterTitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Eyebrow Kicker (Top pill)</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentScene.eyebrow || ''}
                  placeholder="e.g. THE CHALLENGE / গ্রাহক সেবা"
                  onChange={(e) => handleUpdateScene(selectedSceneIndex, { eyebrow: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Headline (Supports Bengali & English)</label>
                <textarea
                  rows={2}
                  className="form-input font-bold"
                  value={currentScene.headline || ''}
                  placeholder="e.g. হাজারো কাস্টমার মেসেজ সামলাতে হিমশিম খাচ্ছেন?"
                  onChange={(e) => handleUpdateScene(selectedSceneIndex, { headline: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Highlight Words (Words to highlight with accent color, comma-separated)
                </label>
                <input
                  type="text"
                  className="form-input text-emerald-400 font-semibold"
                  value={(currentScene.highlightWords || []).join(', ')}
                  placeholder="e.g. হিমশিম, কাস্টমার"
                  onChange={(e) => {
                    const words = e.target.value.split(',').map(w => w.trim()).filter(Boolean);
                    handleUpdateScene(selectedSceneIndex, { highlightWords: words });
                  }}
                />
              </div>

              {currentScene.kind === 'stat' && (
                <div className="form-row-2 stat-input-box">
                  <div className="form-group">
                    <label className="form-label">Stat Giant Value</label>
                    <input
                      type="text"
                      className="form-input text-xl font-black text-amber-400"
                      value={currentScene.statValue || ''}
                      placeholder="e.g. ১০ গুণ / 10x / 0.0%"
                      onChange={(e) => handleUpdateScene(selectedSceneIndex, { statValue: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stat Explanatory Label</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentScene.statLabel || ''}
                      placeholder="e.g. দ্রুত কাস্টমার রেসপন্স ও বিক্রির গতি"
                      onChange={(e) => handleUpdateScene(selectedSceneIndex, { statLabel: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Subheadline / Supporting Note</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentScene.subheadline || ''}
                  placeholder="e.g. প্রতিটি মেসেজের উত্তর দেওয়া এখন আরও সহজ ও দ্রুত।"
                  onChange={(e) => handleUpdateScene(selectedSceneIndex, { subheadline: e.target.value })}
                />
              </div>

              {/* Narration Script & Gemini TTS Voiceover */}
              <div className="form-group" style={{ background: 'rgba(116,96,217,0.06)', padding: 12, borderRadius: 8, border: '1px solid rgba(116,96,217,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, color: '#F4C35E' }}>
                    <Mic size={14} /> Narration Script (Voiceover)
                  </label>
                  {currentScene.narrationAssetId && (
                    <span style={{ fontSize: 11, color: '#34D399', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> {currentScene.narrationDurationSeconds?.toFixed(1)}s audio ready
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  className="form-input"
                  style={{ minHeight: 60 }}
                  value={currentScene.narrationText ?? (currentScene.headline || '')}
                  placeholder="Enter narration text in Bengali or English for this scene..."
                  onChange={(e) => handleUpdateScene(selectedSceneIndex, { narrationText: e.target.value })}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleGenerateSceneVoice(currentScene.id)}
                    disabled={generatingSceneId === currentScene.id}
                  >
                    <RefreshCw size={12} className={generatingSceneId === currentScene.id ? 'animate-spin' : ''} />
                    <span>{generatingSceneId === currentScene.id ? 'Generating...' : 'Generate Voice (Gemini TTS)'}</span>
                  </button>

                  {currentScene.narrationAssetId && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handlePlaySceneVoice(currentScene.narrationAssetId!)}
                    >
                      <Play size={12} /> Listen
                    </button>
                  )}

                  {currentScene.narrationDurationSeconds && currentScene.durationSeconds < currentScene.narrationDurationSeconds + 0.4 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#F4C35E', borderColor: 'rgba(244,195,94,0.3)' }}
                      onClick={() => handleUpdateScene(selectedSceneIndex, { durationSeconds: Math.ceil(currentScene.narrationDurationSeconds! + 0.5) })}
                      title="Audio is longer than scene. Click to adjust."
                    >
                      Fit ({Math.ceil(currentScene.narrationDurationSeconds + 0.5)}s)
                    </button>
                  )}
                </div>
              </div>

              {(currentScene.kind === 'cta' || currentScene.ctaLabel) && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Button Label</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentScene.ctaLabel || ''}
                      placeholder="e.g. ফ্রি ট্রায়াল শুরু করুন"
                      onChange={(e) => handleUpdateScene(selectedSceneIndex, { ctaLabel: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destination URL</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentScene.ctaDestination || ''}
                      placeholder="e.g. https://yourbrand.com"
                      onChange={(e) => handleUpdateScene(selectedSceneIndex, { ctaDestination: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="step-navigation-bar">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to Templates</span>
        </button>
        <button onClick={onNext} className="btn-primary">
          <span>Next: Brand Kit & Media</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

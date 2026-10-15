import React, { useState } from 'react';
import { Project, CreativeSuggestion, CreativeAudit } from '../types';
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
  CheckCircle2,
  Award,
  Lock,
  Unlock,
  Check,
  FileCheck,
  Wand2,
  AlertCircle
} from 'lucide-react';
import { generateNarration, fitScenesToAudio } from '../api';
import { CreativeReviewModal } from './CreativeReviewModal';
import { SceneRewriteModal } from './SceneRewriteModal';
import { ConceptComparisonModal } from './ConceptComparisonModal';

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

  // Creative Director Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [rewriteSceneId, setRewriteSceneId] = useState<string | null>(null);
  const [isConceptModalOpen, setIsConceptModalOpen] = useState<boolean>(false);

  const scenes = project.scenes || [];
  const totalDuration = scenes.reduce((acc, s) => acc + (Number(s.durationSeconds) || 4), 0);
  const approvedCount = scenes.filter(s => s.isApproved || s.approvalStatus === 'approved' || s.approvalStatus === 'locked').length;

  const handleUpdateScene = (index: number, updates: any) => {
    const newScenes = [...scenes];
    const current = newScenes[index];
    const changedCreativeContent = ['headline', 'subheadline', 'narrationText', 'ctaLabel', 'ctaDestination', 'claims', 'mediaAssetIds', 'motion', 'layout', 'deviceFrame', 'callouts', 'durationSeconds', 'chapterTitle', 'eyebrow', 'highlightWords', 'statValue', 'statLabel', 'afterTransition'].some(
      field => Object.prototype.hasOwnProperty.call(updates, field) && JSON.stringify(updates[field]) !== JSON.stringify((current as any)[field])
    );
    const narrationChanged = Object.prototype.hasOwnProperty.call(updates, 'narrationText') && updates.narrationText !== current.narrationText;
    newScenes[index] = {
      ...current,
      ...updates,
      ...(changedCreativeContent ? { approvalStatus: 'draft', isApproved: false } : {}),
      ...(narrationChanged ? { narrationAssetId: undefined, narrationDurationSeconds: undefined } : {})
    };
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
    const selected = scenes.find(scene => scene.id === sceneId);
    if (!selected || !(selected.isApproved || ['approved', 'locked'].includes(selected.approvalStatus || '')) || !selected.narrationText?.trim()) {
      alert('Approve a non-empty narration script before generating voice.');
      return;
    }
    if (!window.confirm(`Online — Gemini: send this approved narration text to Gemini for speech generation?\n\n${selected.narrationText}\n\nNo project images or assets are sent.`)) return;
    setGeneratingSceneId(sceneId);
    try {
      const res = await generateNarration(project.project.id, {
        sceneId,
        voice: project.audio?.narration?.voice || 'Puck',
        fitDuration: true,
        consentToSend: true
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
    const notReady = scenes.find(scene => !(scene.isApproved || ['approved', 'locked'].includes(scene.approvalStatus || '')) || !scene.narrationText?.trim());
    if (notReady) {
      alert(`Approve a non-empty narration script for every scene first. Check scene ${notReady.id}.`);
      return;
    }
    const scripts = scenes.map(scene => `${scene.id}: ${scene.narrationText}`).join('\n');
    if (!window.confirm(`Online — Gemini: send the approved scene narration scripts to Gemini for speech generation?\n\n${scripts}\n\nNo project images or assets are sent.`)) return;
    setIsGeneratingAll(true);
    try {
      const res = await generateNarration(project.project.id, {
        allScenes: true,
        voice: project.audio?.narration?.voice || 'Puck',
        fitDuration: true,
        consentToSend: true
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
      <div className="step-header flex-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 className="step-title">Step 3: Storyboard, Chapters & Typography</h2>
          <p className="step-subtitle">
            Configure narrative scenes, Bengali/English headlines, highlighted words, and durations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setIsConceptModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{
              borderColor: 'rgba(99, 102, 241, 0.4)',
              color: '#A5B4FC'
            }}
            title="Open AI Creative Director to view brief, truth profile, or 3 concepts"
          >
            <Sparkles size={13} color="#F59E0B" />
            <span>AI Concepts & Brief</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReviewModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{
              borderColor: project.creative?.creativeAudit ? 'rgba(52, 211, 153, 0.4)' : 'rgba(168, 85, 247, 0.4)',
              color: project.creative?.creativeAudit ? '#6EE7B7' : '#D8B4FE'
            }}
            title="Open Creative Director Audit Report"
          >
            <Award size={13} />
            <span>
              {project.creative?.creativeAudit
                ? `Review Audit (${project.creative.creativeAudit.overallScore}/10)`
                : 'Creative Review'}
            </span>
          </button>

          <div
            className="badge-chip"
            style={{
              background: approvedCount === scenes.length ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.12)',
              color: approvedCount === scenes.length ? '#34D399' : '#FBBF24',
              borderColor: approvedCount === scenes.length ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.25)',
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600
            }}
          >
            {approvedCount === scenes.length ? <Check size={12} /> : <Clock size={12} />}
            <span>Approved: {approvedCount}/{scenes.length}</span>
          </div>

          <div className="total-duration-badge">
            <Clock className="w-4 h-4 text-amber-400 mr-1" />
            <span>Total: <strong>{totalDuration.toFixed(1)}s</strong></span>
          </div>
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
              const isLocked = s.approvalStatus === 'locked';
              const isApproved = s.isApproved || s.approvalStatus === 'approved';

              return (
                <div
                  key={s.id || idx}
                  onClick={() => setSelectedSceneIndex(idx)}
                  className={`scene-nav-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="scene-nav-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {isLocked ? (
                        <Lock size={11} color="#F59E0B" title="Locked" />
                      ) : isApproved ? (
                        <CheckCircle2 size={11} color="#10B981" title="Approved" />
                      ) : (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#64748B',
                            display: 'inline-block'
                          }}
                          title="Draft"
                        />
                      )}
                      <span className="scene-nav-num">#{idx + 1}</span>
                    </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="scene-index-badge">
                  Editing Scene #{selectedSceneIndex + 1} ({currentScene.id})
                </div>

                <button
                  type="button"
                  onClick={() => setRewriteSceneId(currentScene.id)}
                  className="btn btn-secondary btn-xs"
                  style={{
                    color: '#F59E0B',
                    borderColor: 'rgba(245, 158, 11, 0.4)',
                    background: 'rgba(245, 158, 11, 0.08)'
                  }}
                  title="Rewrite this specific scene using OpenAI Creative Director"
                >
                  <Sparkles size={12} />
                  <span>Rewrite with AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const curStatus = currentScene.approvalStatus || (currentScene.isApproved ? 'approved' : 'draft');
                    const nextStatus = curStatus === 'draft' ? 'approved' : curStatus === 'approved' ? 'locked' : 'draft';
                    handleUpdateScene(selectedSceneIndex, {
                      approvalStatus: nextStatus,
                      isApproved: nextStatus === 'approved' || nextStatus === 'locked'
                    });
                  }}
                  className="btn btn-secondary btn-xs"
                  style={{
                    color: currentScene.approvalStatus === 'locked'
                      ? '#F59E0B'
                      : (currentScene.isApproved || currentScene.approvalStatus === 'approved')
                      ? '#10B981'
                      : '#94A3B8',
                    borderColor: currentScene.approvalStatus === 'locked'
                      ? 'rgba(245, 158, 11, 0.4)'
                      : (currentScene.isApproved || currentScene.approvalStatus === 'approved')
                      ? 'rgba(16, 185, 129, 0.4)'
                      : 'rgba(148, 163, 184, 0.3)'
                  }}
                  title="Click to cycle status: Draft -> Approved -> Locked"
                >
                  {currentScene.approvalStatus === 'locked' ? (
                    <>
                      <Lock size={12} />
                      <span>Locked</span>
                    </>
                  ) : (currentScene.isApproved || currentScene.approvalStatus === 'approved') ? (
                    <>
                      <CheckCircle2 size={12} />
                      <span>Approved</span>
                    </>
                  ) : (
                    <>
                      <Clock size={12} />
                      <span>Draft</span>
                    </>
                  )}
                </button>
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
                  placeholder="Write an opening line using the language selected for this project."
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
                  placeholder="Choose words already used in this scene"
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
                      placeholder="Enter only a value supported by approved evidence"
                      onChange={(e) => handleUpdateScene(selectedSceneIndex, { statValue: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stat Explanatory Label</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentScene.statLabel || ''}
                      placeholder="Describe the evidence and its scope"
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
                  placeholder="Add supporting copy that stays within approved product facts."
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
                  value={currentScene.narrationText ?? ''}
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

              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label" style={{ fontSize: 11, color: '#94A3B8' }}>
                  Pronunciation & Delivery Notes (Phonetic accents, brand spelling, pauses)
                </label>
                <input
                  type="text"
                  className="form-input text-xs"
                  value={currentScene.pronunciationNotes || ''}
                  placeholder="e.g. Pronounce brand clearly, 0.4s pause before reveal"
                  onChange={(e) => handleUpdateScene(selectedSceneIndex, { pronunciationNotes: e.target.value })}
                />
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

      {/* Creative Review Modal */}
      <CreativeReviewModal
        project={project}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onApplySuggestion={(sugg) => {
          const targetIdx = scenes.findIndex(s => s.id === sugg.targetSceneId);
          if (targetIdx !== -1) {
            handleUpdateScene(targetIdx, {
              headline: sugg.proposedText,
              narrationText: sugg.proposedText,
              approvalStatus: 'draft',
              isApproved: false
            });
          }
        }}
        onAuditUpdated={(updatedAudit) => {
          onChange({
            ...project,
            creative: {
              ...project.creative,
              creativeAudit: updatedAudit
            }
          });
        }}
      />

      {/* Selective Single Scene AI Rewrite Modal */}
      <SceneRewriteModal
        project={project}
        sceneId={rewriteSceneId || ''}
        isOpen={Boolean(rewriteSceneId)}
        onClose={() => setRewriteSceneId(null)}
        onSceneRewritten={(updatedProj) => {
          onChange(updatedProj);
          setRewriteSceneId(null);
        }}
      />

      {/* AI Concepts & Brief Modal */}
      <ConceptComparisonModal
        project={project}
        isOpen={isConceptModalOpen}
        onClose={() => setIsConceptModalOpen(false)}
        onStoryboardCompiled={(updatedProj) => {
          onChange(updatedProj);
          setIsConceptModalOpen(false);
        }}
      />
    </div>
  );
};

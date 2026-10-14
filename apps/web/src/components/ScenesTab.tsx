import React, { useState } from 'react';
import { Project } from '../types';
import { Clapperboard, Plus, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';

interface ScenesTabProps {
  project: Project;
  onChange: (updated: Project) => void;
}

export const ScenesTab: React.FC<ScenesTabProps> = ({ project, onChange }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scenes = project.scenes || [];
  const selectedScene = scenes[selectedIndex] || scenes[0];

  const updateScene = (index: number, updatedFields: any) => {
    const updated = [...scenes];
    updated[index] = {
      ...updated[index],
      ...updatedFields
    };
    onChange({
      ...project,
      scenes: updated
    });
  };

  const updateMotion = (index: number, motionFields: any) => {
    const updated = [...scenes];
    updated[index] = {
      ...updated[index],
      motion: {
        ...(updated[index].motion || {}),
        ...motionFields
      }
    };
    onChange({
      ...project,
      scenes: updated
    });
  };

  const handleAddScene = () => {
    const newId = `scene-${Date.now().toString(36)}`;
    const newScene = {
      id: newId,
      kind: 'kinetic_text',
      durationSeconds: 4,
      eyebrow: 'NEW SCENE',
      headline: 'Bold Kinetic Headline',
      subheadline: 'Supporting explanation line',
      highlightWords: ['Headline'],
      motion: {
        entrance: 'stagger_words',
        exit: 'fade',
        easing: 'spring',
        staggerMilliseconds: 70
      }
    };
    const updated = [...scenes, newScene];
    onChange({
      ...project,
      scenes: updated
    });
    setSelectedIndex(updated.length - 1);
  };

  const handleDuplicateScene = (index: number) => {
    const orig = scenes[index];
    const clone = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `scene-${Date.now().toString(36)}`,
      headline: `${orig.headline || 'Scene'} (Copy)`
    };
    const updated = [...scenes];
    updated.splice(index + 1, 0, clone);
    onChange({ ...project, scenes: updated });
    setSelectedIndex(index + 1);
  };

  const handleDeleteScene = (index: number) => {
    if (scenes.length <= 1) return;
    const updated = scenes.filter((_, idx) => idx !== index);
    onChange({ ...project, scenes: updated });
    setSelectedIndex(Math.max(0, index - 1));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= scenes.length) return;
    const updated = [...scenes];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange({ ...project, scenes: updated });
    setSelectedIndex(targetIdx);
  };

  return (
    <div className="inspector-body">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#F4C35E' }}>
          <Clapperboard size={14} /> Scene Timeline ({scenes.length})
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleAddScene}>
          <Plus size={14} /> Add Scene
        </button>
      </div>

      <div className="scene-cards-list">
        {scenes.map((s, idx) => (
          <div
            key={s.id || idx}
            className={`scene-card-item ${selectedIndex === idx ? 'selected' : ''}`}
            onClick={() => setSelectedIndex(idx)}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="scene-item-title">
                #{idx + 1} {s.headline || s.kind}
              </div>
              <div className="scene-item-meta">
                {s.kind} • {s.durationSeconds}s • {s.motion?.entrance || 'stagger_words'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }}
                disabled={idx === 0}
                title="Move Up"
              >
                <ArrowUp size={12} />
              </button>
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }}
                disabled={idx === scenes.length - 1}
                title="Move Down"
              >
                <ArrowDown size={12} />
              </button>
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); handleDuplicateScene(idx); }}
                title="Duplicate"
              >
                <Copy size={12} />
              </button>
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); handleDeleteScene(idx); }}
                disabled={scenes.length <= 1}
                title="Delete"
              >
                <Trash2 size={12} color={scenes.length > 1 ? '#ef4444' : '#64748b'} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedScene && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            Editing Scene #{selectedIndex + 1} ({selectedScene.id})
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Scene Kind</label>
              <select
                className="form-select"
                value={selectedScene.kind || 'kinetic_text'}
                onChange={(e) => updateScene(selectedIndex, { kind: e.target.value })}
              >
                <option value="kinetic_text">Kinetic Text (Hook)</option>
                <option value="problem">Problem Statement</option>
                <option value="solution">Solution / Reveal</option>
                <option value="ui_demo">UI Demo / Screenshot</option>
                <option value="feature">Feature Highlights</option>
                <option value="cta">Call To Action (Outro)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Duration ({selectedScene.durationSeconds}s)</label>
              <input
                type="number"
                min={1}
                max={30}
                className="form-input"
                value={selectedScene.durationSeconds || 4}
                onChange={(e) => updateScene(selectedIndex, { durationSeconds: parseFloat(e.target.value) || 4 })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Eyebrow Kicker (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={selectedScene.eyebrow || ''}
              onChange={(e) => updateScene(selectedIndex, { eyebrow: e.target.value })}
              placeholder="e.g. THE CHALLENGE"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Headline (Main Kinetic Text)</label>
            <input
              type="text"
              className="form-input"
              value={selectedScene.headline || ''}
              onChange={(e) => updateScene(selectedIndex, { headline: e.target.value })}
              placeholder="Primary scene text"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Highlight Words (Comma-separated)</label>
            <input
              type="text"
              className="form-input"
              value={(selectedScene.highlightWords || []).join(', ')}
              onChange={(e) => {
                const words = e.target.value.split(',').map((w) => w.trim()).filter(Boolean);
                updateScene(selectedIndex, { highlightWords: words });
              }}
              placeholder="e.g. messages, EasyModerator"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subheadline (Supporting Line)</label>
            <input
              type="text"
              className="form-input"
              value={selectedScene.subheadline || ''}
              onChange={(e) => updateScene(selectedIndex, { subheadline: e.target.value })}
              placeholder="Secondary line"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Body Text (Optional Detail)</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: 50 }}
              value={selectedScene.body || ''}
              onChange={(e) => updateScene(selectedIndex, { body: e.target.value })}
              placeholder="Optional longer copy"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Entrance Motion</label>
              <select
                className="form-select"
                value={selectedScene.motion?.entrance || 'stagger_words'}
                onChange={(e) => updateMotion(selectedIndex, { entrance: e.target.value })}
              >
                <option value="stagger_words">Stagger Words</option>
                <option value="fade_up">Fade Up</option>
                <option value="slide_left">Slide Left</option>
                <option value="scale_pop">Scale Pop</option>
                <option value="mask_reveal">Mask Reveal</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Exit Motion</label>
              <select
                className="form-select"
                value={selectedScene.motion?.exit || 'fade'}
                onChange={(e) => updateMotion(selectedIndex, { exit: e.target.value })}
              >
                <option value="fade">Fade</option>
                <option value="slide_left">Slide Left</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Easing</label>
              <select
                className="form-select"
                value={selectedScene.motion?.easing || 'spring'}
                onChange={(e) => updateMotion(selectedIndex, { easing: e.target.value })}
              >
                <option value="spring">Spring (Energetic)</option>
                <option value="ease_out">Ease Out (Smooth)</option>
                <option value="ease_in_out">Ease In Out</option>
                <option value="linear">Linear</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Media Asset</label>
              <select
                className="form-select"
                value={(selectedScene.mediaAssetIds && selectedScene.mediaAssetIds[0]) || ''}
                onChange={(e) => {
                  const val = e.target.value ? [e.target.value] : [];
                  updateScene(selectedIndex, { mediaAssetIds: val });
                }}
              >
                <option value="">(None)</option>
                {(project.assets || []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} ({a.kind})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedScene.kind === 'ui_demo' && (
            <div className="form-group">
              <label className="form-label">Device Mockup Frame</label>
              <select
                className="form-select"
                value={selectedScene.deviceFrame || 'browser_window'}
                onChange={(e) => updateScene(selectedIndex, { deviceFrame: e.target.value })}
              >
                <option value="browser_window">Browser Window Mockup</option>
                <option value="clean_frame">Clean Floating Card</option>
              </select>
            </div>
          )}

          {(selectedScene.kind === 'cta' || selectedScene.ctaLabel) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">CTA Label</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedScene.ctaLabel || ''}
                  onChange={(e) => updateScene(selectedIndex, { ctaLabel: e.target.value })}
                  placeholder="e.g. Try It Free"
                />
              </div>
              <div className="form-group">
                <label className="form-label">CTA Destination</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedScene.ctaDestination || ''}
                  onChange={(e) => updateScene(selectedIndex, { ctaDestination: e.target.value })}
                  placeholder="e.g. easymod.tech"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Project } from '../types';
import { Music, Volume2, VolumeX } from 'lucide-react';

interface AudioTabProps {
  project: Project;
  onChange: (updated: Project) => void;
}

export const AudioTab: React.FC<AudioTabProps> = ({ project, onChange }) => {
  const audio = project.audio || {};

  const updateAudio = (field: string, val: any) => {
    onChange({
      ...project,
      audio: {
        ...project.audio,
        [field]: val
      }
    });
  };

  const musicAssets = (project.assets || []).filter((a) => a.kind === 'music');

  return (
    <div className="inspector-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#F4C35E' }}>
        <Music size={14} /> Audio & Sound Mixing
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Mute Audio Output</span>
          <input
            type="checkbox"
            checked={!!audio.muteAll}
            onChange={(e) => updateAudio('muteAll', e.target.checked)}
          />
        </label>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          When muted, a silent audio track is encoded for optimal social media playback compatibility.
        </div>
      </div>

      {!audio.muteAll && (
        <>
          <div className="form-group">
            <label className="form-label">Background Music Track</label>
            <select
              className="form-select"
              value={audio.musicAssetId || ''}
              onChange={(e) => updateAudio('musicAssetId', e.target.value)}
            >
              <option value="">(None)</option>
              {musicAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} ({a.file})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Music Volume ({Math.round((audio.musicVolume ?? 0.3) * 100)}%)</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={audio.musicVolume ?? 0.3}
              onChange={(e) => updateAudio('musicVolume', parseFloat(e.target.value))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Fade In ({audio.fadeInSeconds ?? 0.4}s)</label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                className="form-input"
                value={audio.fadeInSeconds ?? 0.4}
                onChange={(e) => updateAudio('fadeInSeconds', parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fade Out ({audio.fadeOutSeconds ?? 0.8}s)</label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                className="form-input"
                value={audio.fadeOutSeconds ?? 0.8}
                onChange={(e) => updateAudio('fadeOutSeconds', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

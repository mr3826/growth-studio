import React from 'react';
import { Project } from '../types';
import { Video, Sparkles } from 'lucide-react';

interface ExportTabProps {
  project: Project;
  onChange: (updated: Project) => void;
  onOpenExportModal: () => void;
}

export const ExportTab: React.FC<ExportTabProps> = ({ project, onChange, onOpenExportModal }) => {
  const exp = project.export || {};

  const updateExport = (field: string, val: any) => {
    onChange({
      ...project,
      export: {
        ...project.export,
        [field]: val
      }
    });
  };

  return (
    <div className="inspector-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#F4C35E' }}>
        <Video size={14} /> Video Export Settings
      </div>

      <div className="form-group">
        <label className="form-label">Output File Stem</label>
        <input
          type="text"
          className="form-input"
          value={exp.fileStem || project.project.id}
          onChange={(e) => updateExport('fileStem', e.target.value)}
          placeholder="e.g. easymoderator-launch"
        />
        <div style={{ fontSize: 11, color: '#64748b' }}>
          Will produce `{exp.fileStem || project.project.id}-portrait.mp4` and `{exp.fileStem || project.project.id}-landscape.mp4`.
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Video Codec</label>
        <select
          className="form-select"
          value={exp.videoCodec || 'h264'}
          onChange={(e) => updateExport('videoCodec', e.target.value)}
        >
          <option value="h264">H.264 / AVC (Universally compatible)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Audio Codec</label>
        <select
          className="form-select"
          value={exp.audioCodec || 'aac'}
          onChange={(e) => updateExport('audioCodec', e.target.value)}
        >
          <option value="aac">AAC (192 kbps)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Quality Preset</label>
        <select
          className="form-select"
          value={exp.qualityPreset || 'high'}
          onChange={(e) => updateExport('qualityPreset', e.target.value)}
        >
          <option value="high">High Quality (CRF 19)</option>
          <option value="standard">Standard (CRF 23)</option>
          <option value="draft">Fast Draft (CRF 28)</option>
        </select>
      </div>

      <div style={{ marginTop: 10 }}>
        <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={onOpenExportModal}>
          <Sparkles size={16} /> Open Render & Export Center
        </button>
      </div>
    </div>
  );
};

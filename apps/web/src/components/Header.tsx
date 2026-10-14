import React from 'react';
import { Project } from '../types';
import { Sparkles, CheckCircle2, Download, Save, Plus, FileText, Upload } from 'lucide-react';

interface HeaderProps {
  project: Project | null;
  projectsList: Array<{ id: string; name: string }>;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onLoadPreset: (preset: string) => void;
  onSaveProject: () => void;
  onOpenPreflight: () => void;
  onOpenExport: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  isSaving: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  projectsList,
  onSelectProject,
  onNewProject,
  onLoadPreset,
  onSaveProject,
  onOpenPreflight,
  onOpenExport,
  onExportJson,
  onImportJson,
  isSaving
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportJson(e.target.files[0]);
    }
  };

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <div className="brand-logo-icon">⚡</div>
          <span>Kinetic Studio</span>
        </div>
        <span className="badge-offline">OFFLINE V0.01</span>
      </div>

      <div className="header-center">
        <select
          className="project-select"
          value={project?.project.id || ''}
          onChange={(e) => onSelectProject(e.target.value)}
        >
          {projectsList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <button className="btn btn-secondary btn-sm" onClick={onNewProject} title="Create blank project">
          <Plus size={14} /> New
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onLoadPreset('easymoderator')}
          title="Load EasyModerator promotional demo"
        >
          <Sparkles size={14} color="#F4C35E" /> Load EasyModerator
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onExportJson}
          title="Download Project JSON"
        >
          <Download size={14} /> JSON
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => fileInputRef.current?.click()}
          title="Import Project JSON"
        >
          <Upload size={14} /> Import
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={handleFileChange}
        />
      </div>

      <div className="header-actions">
        <button className="btn btn-secondary" onClick={onOpenPreflight}>
          <CheckCircle2 size={16} color="#10b981" /> Preflight Check
        </button>

        <button className="btn btn-secondary" onClick={onSaveProject} disabled={isSaving}>
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
        </button>

        <button className="btn btn-accent" onClick={onOpenExport}>
          <Sparkles size={16} /> Export MP4
        </button>
      </div>
    </header>
  );
};

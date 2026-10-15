import React, { useState, useEffect } from 'react';
import { Project, StarterTemplate } from '../types';
import { fetchStarters, fetchProjects, createProject, deleteProject } from '../api';
import { ConceptComparisonModal } from './ConceptComparisonModal';
import { Plus, FolderOpen, Trash2, HardDrive, ShieldCheck, Sparkles, ArrowRight, Wand2 } from 'lucide-react';

interface ProjectHomeStepProps {
  currentProject: Project | null;
  onSelectProject: (id: string) => void;
  onProjectCreated: (newProj: Project) => void;
  onContinue: () => void;
}

export const ProjectHomeStep: React.FC<ProjectHomeStepProps> = ({
  currentProject,
  onSelectProject,
  onProjectCreated,
  onContinue
}) => {
  const [starters, setStarters] = useState<StarterTemplate[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [selectedStarterId, setSelectedStarterId] = useState<string>('blank');
  const [isCreativeModalOpen, setIsCreativeModalOpen] = useState<boolean>(false);

  const refreshList = async () => {
    setIsLoading(true);
    try {
      const [startersData, projectsData] = await Promise.all([
        fetchStarters(),
        fetchProjects()
      ]);
      setStarters(startersData);
      setProjectsList(projectsData);
    } catch (e) {
      console.error('Failed to load project home data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleCreateNew = async () => {
    setIsCreating(true);
    try {
      const name = newProjectName.trim() || undefined;
      const created = await createProject({
        name,
        starter: selectedStarterId
      });
      onProjectCreated(created);
      await refreshList();
    } catch (err: any) {
      alert(`Error creating project: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete project '${id}'?`)) return;
    try {
      await deleteProject(id);
      await refreshList();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="step-container project-home-view">
      <div className="home-hero-banner">
        <div>
          <h1 className="home-hero-title">Growth Studio V0.03</h1>
          <p className="home-hero-subtitle">
            Build an editable product story, then preview and render it locally with your chosen brand.
          </p>
        </div>
        <div className="system-status-badges">
          <span className="badge-chip storage-badge">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Storage: configured local drive</span>
          </span>
          <span className="badge-chip offline-badge">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Offline editing and local rendering</span>
          </span>
        </div>
      </div>

      {currentProject && (
        <div className="active-project-card">
          <div className="active-project-info">
            <span className="active-tag">CURRENT ACTIVE PROJECT</span>
            <h2 className="active-title">{currentProject.project.name}</h2>
            <div className="active-meta">
              <span>Template: <strong>{currentProject.template.id}</strong></span>
              <span>Scenes: <strong>{currentProject.scenes.length}</strong></span>
              <span>Language: <strong>{currentProject.project.language}</strong></span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setIsCreativeModalOpen(true)}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #6366F1 100%)',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                borderColor: 'transparent'
              }}
              title="Open AI Creative Director to develop 3 concepts or storyboard"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              <span>AI Creative Director</span>
            </button>
            <button onClick={onContinue} className="btn-primary continue-btn">
              <span>Continue in Work Tree</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      <div className="home-grid-layout">
        {/* Left Column: Create Video from Starter */}
        <div className="home-card create-card">
          <div className="card-header">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="card-title">Create New Video</h3>
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Project Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Your Product Spring Launch"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Choose Starter Composition</label>
            <div className="starters-list">
              {starters.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStarterId(s.id)}
                  className={`starter-choice-card ${selectedStarterId === s.id ? 'selected' : ''}`}
                >
                  <div className="starter-choice-header">
                    <strong>{s.name}</strong>
                    <span className="starter-lang-pill">{s.language.toUpperCase()}</span>
                  </div>
                  <p className="starter-choice-desc">{s.description}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateNew}
            disabled={isCreating}
            className="btn-primary w-full create-action-btn"
          >
            <Plus className="w-5 h-5 mr-1" />
            <span>{isCreating ? 'Creating...' : 'Initialize Video Project'}</span>
          </button>
        </div>

        {/* Right Column: Existing Projects */}
        <div className="home-card projects-list-card">
          <div className="card-header">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="card-title">Saved Projects ({projectsList.length})</h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading projects...</div>
          ) : projectsList.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No saved projects yet. Create your first video using the form on the left!
            </div>
          ) : (
            <div className="existing-projects-scroll">
              {projectsList.map((p) => {
                const isSelected = currentProject?.project.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className={`project-list-row ${isSelected ? 'active-row' : ''}`}
                  >
                    <div className="row-info">
                      <div className="row-name-line">
                        <strong>{p.name}</strong>
                        {isSelected && <span className="current-badge">ACTIVE</span>}
                      </div>
                      <div className="row-meta-line">
                        <span>{p.templateId}</span>
                        <span>•</span>
                        <span>{p.sceneCount} scenes</span>
                        <span>•</span>
                        <span>{p.duration?.toFixed(1) || 0}s</span>
                      </div>
                    </div>
                    <div className="row-actions">
                      <button
                        onClick={(e) => handleDelete(e, p.id)}
                        className="btn-icon delete-btn"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {currentProject && (
        <ConceptComparisonModal
          project={currentProject}
          isOpen={isCreativeModalOpen}
          onClose={() => setIsCreativeModalOpen(false)}
          onStoryboardCompiled={(updated) => {
            onProjectCreated(updated);
            setIsCreativeModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

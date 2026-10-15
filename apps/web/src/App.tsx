import React, { useState, useEffect, useCallback } from 'react';
import { Project, CreativeProviderStatus } from './types';
import {
  fetchProjects,
  fetchProject,
  createProject,
  saveProject,
  checkHealth,
  fetchCreativeStatus,
  fetchCreativeUsage
} from './api';
import { WorkTreeNav, WorkTreeStep } from './components/WorkTreeNav';
import { ProjectHomeStep } from './components/ProjectHomeStep';
import { TemplateStep } from './components/TemplateStep';
import { StoryboardStep } from './components/StoryboardStep';
import { BrandMediaStep } from './components/BrandMediaStep';
import { MotionMockupsStep } from './components/MotionMockupsStep';
import { PreviewStep } from './components/PreviewStep';
import { ExportStep } from './components/ExportStep';
import { AiUsageModal } from './components/AiUsageModal';
import { HardDrive, Save, Film, Check, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkTreeStep>('home');
  const [completedSteps, setCompletedSteps] = useState<Set<WorkTreeStep>>(new Set(['home']));
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('Saved');
  const [storageLabel, setStorageLabel] = useState<string>('E:\\GrowthStudio (388 GB)');
  const [creativeStatus, setCreativeStatus] = useState<CreativeProviderStatus | null>(null);
  const [projectSpend, setProjectSpend] = useState<{ spent: number; cap: number } | null>(null);
  const [isAiUsageModalOpen, setIsAiUsageModalOpen] = useState<boolean>(false);

  // Load active project, storage status, and creative status on startup
  const initProjects = useCallback(async () => {
    try {
      try {
        const health = await checkHealth();
        if (health.storage) {
          setStorageLabel(`${health.storage.root} (${health.storage.freeGB} GB)`);
        }
      } catch (_) {}

      try {
        const cStat = await fetchCreativeStatus();
        setCreativeStatus(cStat);
      } catch (_) {}

      const list = await fetchProjects();
      if (list && list.length > 0) {
        const first = await fetchProject(list[0].id);
        setProject(first);
        fetchCreativeUsage(first.project.id).then(u => {
          setProjectSpend({ spent: u.totalSpentUsd, cap: u.budgetCapUsd });
        }).catch(() => {});
      } else {
        // Fallback to initial neutral blank project
          const blank = await createProject({ name: 'My First Video', starter: 'blank' });
        setProject(blank);
      }
    } catch (e) {
      console.error('Failed to load initial projects:', e);
    }
  }, []);

  useEffect(() => {
    initProjects();
  }, [initProjects]);

  const handleSelectProject = async (id: string) => {
    try {
      const proj = await fetchProject(id);
      setProject(proj);
      fetchCreativeUsage(proj.project.id).then(u => {
        setProjectSpend({ spent: u.totalSpentUsd, cap: u.budgetCapUsd });
      }).catch(() => {});
      setCurrentStep('template');
      setCompletedSteps(prev => new Set([...prev, 'home']));
    } catch (e) {
      console.error(`Failed to load project ${id}:`, e);
    }
  };

  const handleProjectCreated = (newProj: Project) => {
    setProject(newProj);
    setCurrentStep('template');
    setCompletedSteps(prev => new Set([...prev, 'home', 'template']));
  };

  const handleProjectChange = (updated: Project) => {
    setProject(updated);
    setSaveStatus('Unsaved edits...');
  };

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    setSaveStatus('Saving to disk...');
    try {
      await saveProject(project.project.id, project);
      setSaveStatus('Saved ✓');
    } catch (err: any) {
      setSaveStatus(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (!project) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 1200);
    return () => clearTimeout(timer);
  }, [project?.creative, project?.brand, project?.scenes, project?.targets, project?.template]);

  const markStepDone = (step: WorkTreeStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  };

  const navigateTo = (step: WorkTreeStep) => {
    setCurrentStep(step);
    markStepDone(currentStep);
  };

  return (
    <div className="growth-studio-app-root">
      {/* Top Application Header */}
      <header className="app-main-header">
        <div className="header-brand-cluster">
          <div className="brand-logo-icon">GS</div>
          <div>
            <div className="header-app-title">GROWTH STUDIO</div>
            <div className="header-app-version">V0.03 • OPENAI CREATIVE DIRECTOR</div>
          </div>
        </div>

        {project && (
          <div className="header-project-pill">
            <span className="pill-dot"></span>
            <strong>{project.project.name}</strong>
            <span className="pill-template">({project.template.id})</span>
          </div>
        )}

        <div className="header-actions-cluster">
          <div className="storage-header-chip" title="Storage volume on local system">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>{storageLabel}</span>
          </div>

          {project && (
            <button
              onClick={() => setIsAiUsageModalOpen(true)}
              className="btn-header-save"
              style={{
                borderColor: creativeStatus?.configured ? 'rgba(245, 158, 11, 0.4)' : 'rgba(148, 163, 184, 0.3)',
                color: creativeStatus?.configured ? '#FBBF24' : '#94A3B8'
              }}
              title="View AI Spend Receipts & Token Budget Cap"
            >
              <Sparkles className="w-4 h-4 mr-1 text-amber-400" />
              <span>
                {creativeStatus?.configured
                  ? `AI Spend: $${projectSpend?.spent?.toFixed(2) || '0.00'} / $${projectSpend?.cap?.toFixed(2) || '1.00'}`
                  : 'AI: Offline'}
              </span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-header-save"
            title="Save changes to project.json"
          >
            <Save className="w-4 h-4 mr-1.5" />
            <span>{isSaving ? 'Saving...' : saveStatus}</span>
          </button>

          {project && (
            <button
              onClick={() => setCurrentStep('export')}
              className="btn-header-export"
              title="Jump to offline video export"
            >
              <Film className="w-4 h-4 mr-1.5" />
              <span>Export Video</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace with Work Tree Navigation and Step Canvas */}
      <div className="app-workspace-body">
        <WorkTreeNav
          currentStep={currentStep}
          onSelectStep={(step) => navigateTo(step)}
          completedSteps={completedSteps}
          projectName={project?.project.name}
        />

        <main className="app-step-content-area" role="main">
          {currentStep === 'home' && (
            <ProjectHomeStep
              currentProject={project}
              onSelectProject={handleSelectProject}
              onProjectCreated={handleProjectCreated}
              onContinue={() => navigateTo('template')}
            />
          )}

          {currentStep === 'template' && project && (
            <TemplateStep
              project={project}
              onChange={handleProjectChange}
              onBack={() => navigateTo('home')}
              onNext={() => {
                markStepDone('template');
                navigateTo('storyboard');
              }}
            />
          )}

          {currentStep === 'storyboard' && project && (
            <StoryboardStep
              project={project}
              onChange={handleProjectChange}
              onBack={() => navigateTo('template')}
              onNext={() => {
                markStepDone('storyboard');
                navigateTo('brand');
              }}
            />
          )}

          {currentStep === 'brand' && project && (
            <BrandMediaStep
              project={project}
              onChange={handleProjectChange}
              onBack={() => navigateTo('storyboard')}
              onNext={() => {
                markStepDone('brand');
                navigateTo('motion');
              }}
            />
          )}

          {currentStep === 'motion' && project && (
            <MotionMockupsStep
              project={project}
              onChange={handleProjectChange}
              onBack={() => navigateTo('brand')}
              onNext={() => {
                markStepDone('motion');
                navigateTo('preview');
              }}
            />
          )}

          {currentStep === 'preview' && project && (
            <PreviewStep
              project={project}
              onBack={() => navigateTo('motion')}
              onProceedToExport={() => {
                markStepDone('preview');
                navigateTo('export');
              }}
            />
          )}

          {currentStep === 'export' && project && (
            <ExportStep
              project={project}
              onBack={() => navigateTo('preview')}
              onGoHome={() => navigateTo('home')}
            />
          )}
        </main>
      </div>

      {project && (
        <AiUsageModal
          project={project}
          isOpen={isAiUsageModalOpen}
          onClose={() => {
            setIsAiUsageModalOpen(false);
            fetchCreativeUsage(project.project.id).then(u => {
              setProjectSpend({ spent: u.totalSpentUsd, cap: u.budgetCapUsd });
            }).catch(() => {});
          }}
        />
      )}
    </div>
  );
};

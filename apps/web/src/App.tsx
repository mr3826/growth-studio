import React, { useState, useEffect, useCallback } from 'react';
import { Project, PreflightReport } from './types';
import {
  fetchProjects,
  fetchProject,
  createProject,
  saveProject,
  fetchPreflight
} from './api';
import { Header } from './components/Header';
import { PreviewPlayer } from './components/PreviewPlayer';
import { QuickCreateTab } from './components/QuickCreateTab';
import { BrandKitTab } from './components/BrandKitTab';
import { ScenesTab } from './components/ScenesTab';
import { AssetsTab } from './components/AssetsTab';
import { AudioTab } from './components/AudioTab';
import { ExportTab } from './components/ExportTab';
import { PreflightModal } from './components/PreflightModal';
import { ExportModal } from './components/ExportModal';
import { Zap, Palette, Clapperboard, FolderOpen, Music, Settings } from 'lucide-react';

export const App: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [projectsList, setProjectsList] = useState<Array<{ id: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState<'quick' | 'brand' | 'scenes' | 'assets' | 'audio' | 'export'>('quick');
  const [targetId, setTargetId] = useState<'portrait' | 'landscape'>('portrait');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(Date.now());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('Saved');

  const [showPreflight, setShowPreflight] = useState<boolean>(false);
  const [preflightReport, setPreflightReport] = useState<PreflightReport | null>(null);
  const [isPreflightLoading, setIsPreflightLoading] = useState<boolean>(false);

  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Load project list on start
  const refreshProjectsList = useCallback(async () => {
    try {
      const list = await fetchProjects();
      setProjectsList(list);
      return list;
    } catch (e) {
      console.error('Failed to load project list:', e);
      return [];
    }
  }, []);

  const loadProjectById = useCallback(async (id: string) => {
    try {
      const proj = await fetchProject(id);
      setProject(proj);
      setRefreshTrigger(Date.now());
      setSaveStatus('Saved');
    } catch (e) {
      console.error(`Failed to load project ${id}:`, e);
    }
  }, []);

  useEffect(() => {
    refreshProjectsList().then(async (list) => {
      if (list.length > 0) {
        await loadProjectById(list[0].id);
      } else {
        // Create initial EasyModerator project
        const newProj = await createProject({ preset: 'easymoderator' });
        setProject(newProj);
        await refreshProjectsList();
      }
    });
  }, [refreshProjectsList, loadProjectById]);

  // Handle project modifications
  const handleProjectChange = (updated: Project) => {
    setProject(updated);
    setSaveStatus('Unsaved edits...');
  };

  // Save project
  const handleSaveProject = async () => {
    if (!project) return;
    setIsSaving(true);
    setSaveStatus('Saving...');
    try {
      await saveProject(project.project.id, project);
      setSaveStatus('Saved to disk ✓');
      setRefreshTrigger(Date.now());
      await refreshProjectsList();
    } catch (err: any) {
      setSaveStatus(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save on project changes
  useEffect(() => {
    if (!project) return;
    const timer = setTimeout(() => {
      handleSaveProject();
    }, 1500);
    return () => clearTimeout(timer);
  }, [project?.creative, project?.brand, project?.scenes, project?.audio]);

  // Create new blank project
  const handleNewProject = async () => {
    const name = prompt('Enter a name for the new project:', 'My Kinetic Promo');
    if (!name) return;
    const newProj = await createProject({ name });
    await refreshProjectsList();
    setProject(newProj);
    setRefreshTrigger(Date.now());
  };

  // Load preset project (e.g. EasyModerator)
  const handleLoadPreset = async (preset: string) => {
    const newProj = await createProject({ preset });
    await refreshProjectsList();
    setProject(newProj);
    setRefreshTrigger(Date.now());
  };

  // Preflight check
  const handleOpenPreflight = async () => {
    if (!project) return;
    setShowPreflight(true);
    setIsPreflightLoading(true);
    try {
      // First ensure project is saved
      await saveProject(project.project.id, project);
      const rep = await fetchPreflight(project.project.id);
      setPreflightReport(rep);
    } catch (e: any) {
      setPreflightReport({
        passed: false,
        errors: [e.message || 'Error running preflight'],
        warnings: [],
        totalDuration: 0
      });
    } finally {
      setIsPreflightLoading(false);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    if (!project) return;
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.project.id}-project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.schemaVersion || !parsed.project || !parsed.scenes) {
          throw new Error('Invalid kinetic studio project schema');
        }
        const created = await createProject({ name: parsed.project.name || 'Imported Promo' });
        parsed.project.id = created.project.id;
        await saveProject(created.project.id, parsed);
        setProject(parsed);
        await refreshProjectsList();
        setRefreshTrigger(Date.now());
        alert('Project JSON imported successfully!');
      } catch (err: any) {
        alert(`Failed to import JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  if (!project) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Loading Kinetic Studio...
      </div>
    );
  }

  return (
    <>
      <Header
        project={project}
        projectsList={projectsList}
        onSelectProject={loadProjectById}
        onNewProject={handleNewProject}
        onLoadPreset={handleLoadPreset}
        onSaveProject={handleSaveProject}
        onOpenPreflight={handleOpenPreflight}
        onOpenExport={() => setShowExportModal(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        isSaving={isSaving}
      />

      <div className="app-main">
        {/* Left Navigation */}
        <nav className="app-sidebar">
          <div className="nav-group">
            <button
              className={`nav-tab-btn ${activeTab === 'quick' ? 'active' : ''}`}
              onClick={() => setActiveTab('quick')}
            >
              <Zap size={16} /> Quick Create
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'brand' ? 'active' : ''}`}
              onClick={() => setActiveTab('brand')}
            >
              <Palette size={16} /> Brand & Palette
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'scenes' ? 'active' : ''}`}
              onClick={() => setActiveTab('scenes')}
            >
              <Clapperboard size={16} /> Scenes & Motion
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('assets')}
            >
              <FolderOpen size={16} /> Assets Manager
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveTab('audio')}
            >
              <Music size={16} /> Audio & Music
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => setActiveTab('export')}
            >
              <Settings size={16} /> Export Settings
            </button>
          </div>

          <div className="system-status-badge">
            <div className="status-row">
              <span>Status:</span>
              <span style={{ color: '#F4C35E', fontWeight: 600 }}>{saveStatus}</span>
            </div>
            <div className="status-row">
              <span>Offline Core:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="status-dot"></span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Ready</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Center Canvas Preview */}
        <PreviewPlayer
          projectId={project.project.id}
          targetId={targetId}
          onChangeTarget={setTargetId}
          refreshTrigger={refreshTrigger}
        />

        {/* Right Inspector Panel */}
        <aside className="app-inspector">
          <div className="inspector-header">
            <span>
              {activeTab === 'quick' && 'Quick Create'}
              {activeTab === 'brand' && 'Brand Kit'}
              {activeTab === 'scenes' && 'Scenes & Animation'}
              {activeTab === 'assets' && 'Imported Assets'}
              {activeTab === 'audio' && 'Audio & Mixing'}
              {activeTab === 'export' && 'Export Configuration'}
            </span>
          </div>

          {activeTab === 'quick' && (
            <QuickCreateTab project={project} onChange={handleProjectChange} />
          )}
          {activeTab === 'brand' && (
            <BrandKitTab project={project} onChange={handleProjectChange} />
          )}
          {activeTab === 'scenes' && (
            <ScenesTab project={project} onChange={handleProjectChange} />
          )}
          {activeTab === 'assets' && (
            <AssetsTab
              project={project}
              onChange={handleProjectChange}
              onRefreshPreview={() => setRefreshTrigger(Date.now())}
            />
          )}
          {activeTab === 'audio' && (
            <AudioTab project={project} onChange={handleProjectChange} />
          )}
          {activeTab === 'export' && (
            <ExportTab
              project={project}
              onChange={handleProjectChange}
              onOpenExportModal={() => setShowExportModal(true)}
            />
          )}
        </aside>
      </div>

      <PreflightModal
        isOpen={showPreflight}
        onClose={() => setShowPreflight(false)}
        report={preflightReport}
        isLoading={isPreflightLoading}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectId={project.project.id}
      />
    </>
  );
};

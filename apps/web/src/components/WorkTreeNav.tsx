import React from 'react';
import {
  Home,
  LayoutTemplate,
  Clapperboard,
  Palette,
  Smartphone,
  Eye,
  DownloadCloud,
  CheckCircle2,
  Circle
} from 'lucide-react';

export type WorkTreeStep =
  | 'home'
  | 'template'
  | 'storyboard'
  | 'brand'
  | 'motion'
  | 'preview'
  | 'export';

interface WorkTreeNavProps {
  currentStep: WorkTreeStep;
  onSelectStep: (step: WorkTreeStep) => void;
  completedSteps: Set<WorkTreeStep>;
  projectName?: string;
}

export const WorkTreeNav: React.FC<WorkTreeNavProps> = ({
  currentStep,
  onSelectStep,
  completedSteps,
  projectName
}) => {
  const steps: Array<{
    id: WorkTreeStep;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'home',
      label: '1. Project Home',
      description: 'Projects & Starters',
      icon: <Home className="w-4 h-4" />
    },
    {
      id: 'template',
      label: '2. Template & Format',
      description: 'Archetype & Aspect Ratio',
      icon: <LayoutTemplate className="w-4 h-4" />
    },
    {
      id: 'storyboard',
      label: '3. Storyboard & Chapters',
      description: 'Scenes & Bengali Headlines',
      icon: <Clapperboard className="w-4 h-4" />
    },
    {
      id: 'brand',
      label: '4. Brand Kit & Media',
      description: 'Colors, Fonts & Assets',
      icon: <Palette className="w-4 h-4" />
    },
    {
      id: 'motion',
      label: '5. Motion & Mockups',
      description: 'Devices & Callouts',
      icon: <Smartphone className="w-4 h-4" />
    },
    {
      id: 'preview',
      label: '6. Preview & Validate',
      description: 'Timeline & Preflight',
      icon: <Eye className="w-4 h-4" />
    },
    {
      id: 'export',
      label: '7. Export Video',
      description: 'Offline MP4 Encoding',
      icon: <DownloadCloud className="w-4 h-4" />
    }
  ];

  return (
    <nav className="work-tree-sidebar" aria-label="Workflow Navigation">
      <div className="work-tree-header">
        <span className="work-tree-title">WORK TREE</span>
        {projectName && <span className="work-tree-project-pill">{projectName}</span>}
      </div>

      <div className="work-tree-steps-list">
        {steps.map((s, index) => {
          const isActive = currentStep === s.id;
          const isDone = completedSteps.has(s.id);

          return (
            <button
              key={s.id}
              onClick={() => onSelectStep(s.id)}
              className={`work-tree-node ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
              title={s.description}
            >
              <div className="node-icon-wrapper">
                {s.icon}
              </div>
              <div className="node-content">
                <span className="node-label">{s.label}</span>
                <span className="node-sublabel">{s.description}</span>
              </div>
              <div className="node-status-indicator">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-3 h-3 text-slate-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

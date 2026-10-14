import React from 'react';
import { Project } from '../types';
import { Sparkles, Wand2 } from 'lucide-react';

interface QuickCreateTabProps {
  project: Project;
  onChange: (updated: Project) => void;
}

export const QuickCreateTab: React.FC<QuickCreateTabProps> = ({ project, onChange }) => {
  const updateProjectField = (field: string, val: any) => {
    onChange({
      ...project,
      project: {
        ...project.project,
        [field]: val
      }
    });
  };

  const updateCreativeField = (field: string, val: any) => {
    onChange({
      ...project,
      creative: {
        ...project.creative,
        [field]: val
      }
    });
  };

  const updateCta = (field: string, val: any) => {
    onChange({
      ...project,
      creative: {
        ...project.creative,
        cta: {
          ...project.creative.cta,
          [field]: val
        }
      }
    });
  };

  const updateBrandField = (field: string, val: any) => {
    onChange({
      ...project,
      brand: {
        ...project.brand,
        [field]: val
      }
    });
  };

  const handleApplyToScenes = () => {
    // Synchronize quick create inputs into the primary scenes
    const newScenes = [...project.scenes];
    if (newScenes[0]) {
      newScenes[0].headline = project.creative.keyMessage || newScenes[0].headline;
      newScenes[0].subheadline = project.brand.tagline || newScenes[0].subheadline;
    }
    const lastScene = newScenes[newScenes.length - 1];
    if (lastScene) {
      lastScene.ctaLabel = project.creative.cta.label || lastScene.ctaLabel;
      lastScene.ctaDestination = project.creative.cta.destination || lastScene.ctaDestination;
    }
    onChange({
      ...project,
      scenes: newScenes
    });
  };

  return (
    <div className="inspector-body">
      <div style={{ background: 'rgba(116, 96, 217, 0.12)', border: '1px solid rgba(116, 96, 217, 0.25)', borderRadius: 10, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#F4C35E', marginBottom: 4 }}>
          <Sparkles size={14} /> Level A: Quick Create
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Enter core campaign details here. These flow into your kinetic typography scenes instantly.
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Project Name</label>
        <input
          type="text"
          className="form-input"
          value={project.project.name || ''}
          onChange={(e) => updateProjectField('name', e.target.value)}
          placeholder="e.g. EasyModerator Launch Film"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Brand / Product Name</label>
        <input
          type="text"
          className="form-input"
          value={project.brand.name || ''}
          onChange={(e) => updateBrandField('name', e.target.value)}
          placeholder="e.g. EasyModerator"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Brand Tagline</label>
        <input
          type="text"
          className="form-input"
          value={project.brand.tagline || ''}
          onChange={(e) => updateBrandField('tagline', e.target.value)}
          placeholder="e.g. Manage conversations. Stay in control."
        />
      </div>

      <div className="form-group">
        <label className="form-label">Primary Kinetic Message / Headline</label>
        <textarea
          className="form-textarea"
          value={project.creative.keyMessage || ''}
          onChange={(e) => updateCreativeField('keyMessage', e.target.value)}
          placeholder="The single most important message of your promo video"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Customer Pain Point / Problem</label>
        <input
          type="text"
          className="form-input"
          value={project.creative.painPoint || ''}
          onChange={(e) => updateCreativeField('painPoint', e.target.value)}
          placeholder="e.g. Handling too many messages manually"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Call To Action (CTA) Button Label</label>
        <input
          type="text"
          className="form-input"
          value={project.creative.cta?.label || ''}
          onChange={(e) => updateCta('label', e.target.value)}
          placeholder="e.g. Explore EasyModerator"
        />
      </div>

      <div className="form-group">
        <label className="form-label">CTA Destination URL or Handle</label>
        <input
          type="text"
          className="form-input"
          value={project.creative.cta?.destination || ''}
          onChange={(e) => updateCta('destination', e.target.value)}
          placeholder="e.g. https://easymod.tech"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Language Mode</label>
        <select
          className="form-select"
          value={project.project.language || 'en'}
          onChange={(e) => updateProjectField('language', e.target.value)}
        >
          <option value="en">English (en)</option>
          <option value="bn">Bangla (bn)</option>
          <option value="mixed">Mixed English & Bangla (mixed)</option>
        </select>
      </div>

      <button className="btn btn-secondary" onClick={handleApplyToScenes}>
        <Wand2 size={14} /> Sync Quick Create to Scenes
      </button>
    </div>
  );
};

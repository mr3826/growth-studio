import React from 'react';
import { Project } from '../types';
import { Palette } from 'lucide-react';

interface BrandKitTabProps {
  project: Project;
  onChange: (updated: Project) => void;
}

export const BrandKitTab: React.FC<BrandKitTabProps> = ({ project, onChange }) => {
  const updateBrand = (field: string, val: any) => {
    onChange({
      ...project,
      brand: {
        ...project.brand,
        [field]: val
      }
    });
  };

  return (
    <div className="inspector-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#F4C35E' }}>
        <Palette size={14} /> Brand Identity & Styling
      </div>

      <div className="form-group">
        <label className="form-label">Primary Brand Color (Buttons & Accents)</label>
        <div className="color-picker-row">
          <input
            type="color"
            className="color-swatch-input"
            value={project.brand.primaryColor || '#7460D9'}
            onChange={(e) => updateBrand('primaryColor', e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            value={project.brand.primaryColor || '#7460D9'}
            onChange={(e) => updateBrand('primaryColor', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Background Color</label>
        <div className="color-picker-row">
          <input
            type="color"
            className="color-swatch-input"
            value={project.brand.backgroundColor || '#17223B'}
            onChange={(e) => updateBrand('backgroundColor', e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            value={project.brand.backgroundColor || '#17223B'}
            onChange={(e) => updateBrand('backgroundColor', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Main Text Color</label>
        <div className="color-picker-row">
          <input
            type="color"
            className="color-swatch-input"
            value={project.brand.textColor || '#FFFFFF'}
            onChange={(e) => updateBrand('textColor', e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            value={project.brand.textColor || '#FFFFFF'}
            onChange={(e) => updateBrand('textColor', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Accent Highlight Color (Word emphasis)</label>
        <div className="color-picker-row">
          <input
            type="color"
            className="color-swatch-input"
            value={project.brand.accentColor || '#F4C35E'}
            onChange={(e) => updateBrand('accentColor', e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            value={project.brand.accentColor || '#F4C35E'}
            onChange={(e) => updateBrand('accentColor', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Latin Font Family</label>
        <select
          className="form-select"
          value={project.brand.latinFontFamily || 'Inter'}
          onChange={(e) => updateBrand('latinFontFamily', e.target.value)}
        >
          <option value="Inter">Inter (Modern & Punchy)</option>
          <option value="Roboto">Roboto</option>
          <option value="Arial">Arial</option>
          <option value="system-ui">System UI Default</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Bangla Font Family</label>
        <select
          className="form-select"
          value={project.brand.banglaFontFamily || 'Noto Sans Bengali'}
          onChange={(e) => updateBrand('banglaFontFamily', e.target.value)}
        >
          <option value="Noto Sans Bengali">Noto Sans Bengali</option>
          <option value="Kalpurush">Kalpurush</option>
          <option value="Siyam Rupali">Siyam Rupali</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Border Radius ({project.brand.cornerRadiusPx || 16}px)</label>
        <input
          type="range"
          min={0}
          max={32}
          value={project.brand.cornerRadiusPx || 16}
          onChange={(e) => updateBrand('cornerRadiusPx', parseInt(e.target.value, 10))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Style Preset</label>
        <select
          className="form-select"
          value={project.brand.stylePreset || 'bold_future'}
          onChange={(e) => updateBrand('stylePreset', e.target.value)}
        >
          <option value="bold_future">Bold Future (High Energy & Contrast)</option>
          <option value="clean_minimal">Clean Minimal</option>
          <option value="warm_commerce">Warm Commerce</option>
        </select>
      </div>
    </div>
  );
};

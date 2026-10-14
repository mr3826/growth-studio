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

  const presets = [
    {
      name: 'EasyModerator (Bold & Future-Facing)',
      primary: '#7460D9',
      bg: '#17223B',
      text: '#FFFFFF',
      accent: '#F4C35E',
      radius: 16
    },
    {
      name: 'Editorial Cream & Lime (Reference)',
      primary: '#18181B',
      bg: '#F9F9F6',
      text: '#18181B',
      accent: '#CCFF00',
      radius: 100
    },
    {
      name: 'SaaS Indigo & Cyan',
      primary: '#4F46E5',
      bg: '#0B0F19',
      text: '#F9FAFB',
      accent: '#38BDF8',
      radius: 12
    },
    {
      name: 'Emerald Growth & Mint',
      primary: '#10B981',
      bg: '#061A14',
      text: '#FFFFFF',
      accent: '#34D399',
      radius: 16
    }
  ];

  const applyPreset = (p: typeof presets[0]) => {
    onChange({
      ...project,
      brand: {
        ...project.brand,
        primaryColor: p.primary,
        backgroundColor: p.bg,
        textColor: p.text,
        accentColor: p.accent,
        cornerRadiusPx: p.radius
      }
    });
  };

  return (
    <div className="inspector-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#F4C35E' }}>
        <Palette size={14} /> Brand Identity & Styling
      </div>

      <div className="form-group">
        <label className="form-label">Brand Color Presets</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {presets.map(p => {
            const isSelected = project.brand.primaryColor === p.primary && project.brand.backgroundColor === p.bg;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: isSelected ? '1px solid #7460D9' : '1px solid rgba(255,255,255,0.1)',
                  background: isSelected ? 'rgba(116,96,217,0.2)' : 'rgba(255,255,255,0.03)',
                  color: '#e2e8f0',
                  fontSize: 11,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', gap: 3 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.bg, border: '1px solid rgba(255,255,255,0.2)' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.primary }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.accent }} />
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name.split(' (')[0]}</span>
              </button>
            );
          })}
        </div>
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

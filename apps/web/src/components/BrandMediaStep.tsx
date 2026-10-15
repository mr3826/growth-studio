import React, { useState } from 'react';
import { Project } from '../types';
import { uploadAsset } from '../api';
import { Palette, Upload, Image as ImageIcon, Music, Trash2, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { AudioTab } from './AudioTab';

interface BrandMediaStepProps {
  project: Project;
  onChange: (updated: Project) => void;
  onBack: () => void;
  onNext: () => void;
}

export const BrandMediaStep: React.FC<BrandMediaStepProps> = ({
  project,
  onChange,
  onBack,
  onNext
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const brand = project.brand || {};

  const handleUpdateBrand = (field: string, value: any) => {
    onChange({
      ...project,
      brand: {
        ...project.brand,
        [field]: value
      }
    });
  };

  const handleApplyPreset = (palette: { bg: string; primary: string; text: string; accent: string; name: string }) => {
    onChange({
      ...project,
      brand: {
        ...project.brand,
        backgroundColor: palette.bg,
        primaryColor: palette.primary,
        textColor: palette.text,
        accentColor: palette.accent
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadAsset(project.project.id, file);
      if (res.success && res.asset) {
        const assets = [...(project.assets || []), res.asset];
        onChange({ ...project, assets });
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    const assets = (project.assets || []).filter(a => a.id !== assetId);
    // Also remove from any scene referencing it
    const scenes = (project.scenes || []).map(s => ({
      ...s,
      mediaAssetIds: (s.mediaAssetIds || []).filter(id => id !== assetId)
    }));
    onChange({ ...project, assets, scenes });
  };

  const presets = [
    {
      name: 'Editorial Cream & Lime (Reference)',
      bg: '#F9F9F6',
      primary: '#18181B',
      text: '#18181B',
      accent: '#CCFF00'
    },
    {
      name: 'EasyModerator (Bold & Future-Facing)',
      bg: '#17223B',
      primary: '#7460D9',
      text: '#FFFFFF',
      accent: '#F4C35E'
    },
    {
      name: 'Tech Midnight & Sky Cyan',
      bg: '#0A0F1D',
      primary: '#0284C7',
      text: '#FFFFFF',
      accent: '#38BDF8'
    },
    {
      name: 'Slate Minimal & Emerald',
      bg: '#0F172A',
      primary: '#6366F1',
      text: '#FFFFFF',
      accent: '#10B981'
    }
  ];

  return (
    <div className="step-container brand-media-step-view">
      <div className="step-header">
        <h2 className="step-title">Step 4: Brand Kit, Color Palette & Media Assets</h2>
        <p className="step-subtitle">
          Customize your brand typography, colors, logos, screenshots, and local audio.
        </p>
      </div>

      <div className="brand-media-grid">
        {/* Left: Brand Identity & Colors */}
        <div className="form-card">
          <div className="card-header">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h3 className="card-title">Brand Identity</h3>
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Brand / Product Name</label>
            <input
              type="text"
              className="form-input font-bold"
              value={brand.name || ''}
              placeholder="Enter your product or brand name"
              onChange={(e) => handleUpdateBrand('name', e.target.value)}
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Tagline / Mission</label>
            <input
              type="text"
              className="form-input"
              value={brand.tagline || ''}
              placeholder="Add a tagline supplied or approved by your team"
              onChange={(e) => handleUpdateBrand('tagline', e.target.value)}
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Color Presets</label>
            <div className="presets-chips-row">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="preset-chip-btn"
                >
                  <span className="preset-swatch" style={{ background: p.bg }}></span>
                  <span className="preset-swatch" style={{ background: p.accent }}></span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="colors-grid mb-4">
            <div className="color-field">
              <label className="form-label">Background</label>
              <div className="color-picker-row">
                <input
                  type="color"
                  className="color-picker-input"
                  value={brand.backgroundColor || '#F9F9F6'}
                  onChange={(e) => handleUpdateBrand('backgroundColor', e.target.value)}
                />
                <input
                  type="text"
                  className="form-input text-xs"
                  value={brand.backgroundColor || '#F9F9F6'}
                  onChange={(e) => handleUpdateBrand('backgroundColor', e.target.value)}
                />
              </div>
            </div>

            <div className="color-field">
              <label className="form-label">Accent / Highlight</label>
              <div className="color-picker-row">
                <input
                  type="color"
                  className="color-picker-input"
                  value={brand.accentColor || '#CCFF00'}
                  onChange={(e) => handleUpdateBrand('accentColor', e.target.value)}
                />
                <input
                  type="text"
                  className="form-input text-xs"
                  value={brand.accentColor || '#CCFF00'}
                  onChange={(e) => handleUpdateBrand('accentColor', e.target.value)}
                />
              </div>
            </div>

            <div className="color-field">
              <label className="form-label">Text Color</label>
              <div className="color-picker-row">
                <input
                  type="color"
                  className="color-picker-input"
                  value={brand.textColor || '#18181B'}
                  onChange={(e) => handleUpdateBrand('textColor', e.target.value)}
                />
                <input
                  type="text"
                  className="form-input text-xs"
                  value={brand.textColor || '#18181B'}
                  onChange={(e) => handleUpdateBrand('textColor', e.target.value)}
                />
              </div>
            </div>

            <div className="color-field">
              <label className="form-label">Primary Brand</label>
              <div className="color-picker-row">
                <input
                  type="color"
                  className="color-picker-input"
                  value={brand.primaryColor || '#18181B'}
                  onChange={(e) => handleUpdateBrand('primaryColor', e.target.value)}
                />
                <input
                  type="text"
                  className="form-input text-xs"
                  value={brand.primaryColor || '#18181B'}
                  onChange={(e) => handleUpdateBrand('primaryColor', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Bengali Font Family</label>
              <select
                className="form-input"
                value={brand.banglaFontFamily || 'Nirmala UI, Noto Sans Bengali, sans-serif'}
                onChange={(e) => handleUpdateBrand('banglaFontFamily', e.target.value)}
              >
                <option value="Nirmala UI, Noto Sans Bengali, sans-serif">Nirmala UI (Windows Native)</option>
                <option value="'Noto Sans Bengali', sans-serif">Noto Sans Bengali</option>
                <option value="Kalpurush, sans-serif">Kalpurush</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Latin Font Family</label>
              <select
                className="form-input"
                value={brand.latinFontFamily || 'Inter, system-ui, sans-serif'}
                onChange={(e) => handleUpdateBrand('latinFontFamily', e.target.value)}
              >
                <option value="Inter, system-ui, -apple-system, sans-serif">Inter</option>
                <option value="system-ui, -apple-system, BlinkMacSystemFont, sans-serif">System UI</option>
                <option value="'Roboto', sans-serif">Roboto</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Media Assets & Local Upload */}
        <div className="form-card">
          <div className="card-header flex-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="card-title">Imported Assets ({(project.assets || []).length})</h3>
            </div>
            <label className="btn-primary btn-sm cursor-pointer">
              <Upload className="w-4 h-4 mr-1" />
              <span>{isUploading ? 'Uploading...' : 'Import File'}</span>
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,audio/mp3,audio/wav,audio/aac,audio/m4a"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Upload local screenshots, product logos, or voiceover/music tracks. Files are stored locally in your project folder.
          </p>

          <div className="assets-items-list">
            {(project.assets || []).length === 0 ? (
              <div className="assets-empty-placeholder">
                <Upload className="w-8 h-8 text-slate-500 mb-2" />
                <span>No assets imported yet. Click "Import File" above to add screenshots or audio.</span>
              </div>
            ) : (
              (project.assets || []).map((a) => {
                const isAudio = a.kind === 'music' || a.kind === 'voiceover';
                return (
                  <div key={a.id} className="asset-item-card">
                    <div className="asset-preview-thumb">
                      {isAudio ? (
                        <Music className="w-6 h-6 text-amber-400" />
                      ) : (
                        <img
                          src={`/api/projects/${project.project.id}/${a.file}`}
                          alt={a.id}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="asset-item-details">
                      <strong>{a.id}</strong>
                      <span className="asset-file-path">{a.file}</span>
                      <span className="asset-kind-badge">{a.kind.toUpperCase()}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteAsset(a.id)}
                      className="btn-icon delete-btn"
                      title="Remove asset"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Audio Studio & Voiceover Pipeline */}
        <div className="form-card" style={{ gridColumn: '1 / -1' }}>
          <AudioTab project={project} onChange={onChange} />
        </div>
      </div>

      <div className="step-navigation-bar">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to Storyboard</span>
        </button>
        <button onClick={onNext} className="btn-primary">
          <span>Next: Motion & Mockups</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import { Project } from '../types';
import { FolderOpen, Upload, Trash2, Image, Music } from 'lucide-react';
import { uploadAsset } from '../api';

interface AssetsTabProps {
  project: Project;
  onChange: (updated: Project) => void;
  onRefreshPreview: () => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({ project, onChange, onRefreshPreview }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await uploadAsset(project.project.id, file);
      if (res.asset) {
        const updatedAssets = [...(project.assets || []), res.asset];
        onChange({
          ...project,
          assets: updatedAssets
        });
        onRefreshPreview();
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload asset');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    const updatedAssets = (project.assets || []).filter((a) => a.id !== assetId);
    // Also remove references from scenes
    const updatedScenes = (project.scenes || []).map((s) => ({
      ...s,
      mediaAssetIds: (s.mediaAssetIds || []).filter((id) => id !== assetId)
    }));

    onChange({
      ...project,
      assets: updatedAssets,
      scenes: updatedScenes
    });
    onRefreshPreview();
  };

  return (
    <div className="inspector-body">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#F4C35E' }}>
          <FolderOpen size={14} /> Imported Assets ({(project.assets || []).length})
        </div>
      </div>

      <div
        style={{
          border: '2px dashed var(--border)',
          borderRadius: 12,
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(255, 255, 255, 0.02)',
          cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={24} color="#7460D9" />
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
          {isUploading ? 'Uploading asset...' : 'Import Media Asset'}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          Click to browse PNG, JPG, WebP, SVG, WAV, MP3
        </div>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,audio/*"
          onChange={handleFileSelected}
        />
      </div>

      {uploadError && (
        <div style={{ color: '#ef4444', fontSize: 12, padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}>
          {uploadError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(project.assets || []).map((asset) => {
          const isAudio = asset.kind === 'music';
          const assetUrl = `/api/projects/${project.project.id}/${asset.file}`;

          return (
            <div
              key={asset.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 6,
                  background: '#0a0e17',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                {isAudio ? (
                  <Music size={20} color="#F4C35E" />
                ) : (
                  <img
                    src={assetUrl}
                    alt={asset.id}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {asset.id}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {asset.kind} • {asset.file}
                </div>
              </div>

              <button
                className="btn-icon"
                onClick={() => handleDeleteAsset(asset.id)}
                title="Remove Asset"
              >
                <Trash2 size={14} color="#ef4444" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

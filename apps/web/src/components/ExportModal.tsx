import React, { useState, useEffect } from 'react';
import { RenderJob } from '../types';
import { queueRender, getDownloadUrl } from '../api';
import { Sparkles, Download, CheckCircle2, AlertCircle, X, Terminal, Smartphone, Monitor } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectId
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'portrait' | 'landscape'>('portrait');
  const [job, setJob] = useState<RenderJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setJob(null);
      setIsStarting(false);
    }
  }, [isOpen]);

  const handleStartRender = async () => {
    setIsStarting(true);
    try {
      const res = await queueRender(projectId, selectedTarget);
      const jobId = res.jobId;

      // Connect to Server-Sent Events
      const evtSource = new EventSource(`/api/renders/${jobId}/events`);
      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setJob(data);
          if (data.status === 'done' || data.status === 'failed' || data.status === 'cancelled') {
            evtSource.close();
          }
        } catch (_) {}
      };
      evtSource.onerror = () => {
        evtSource.close();
      };
    } catch (err: any) {
      alert(`Render error: ${err.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#F4C35E" /> Offline MP4 Render Center
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {!job ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                Select your target video format. Video rendering executes completely offline using headless Chromium and FFmpeg with deterministic frame seeking.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: `2px solid ${selectedTarget === 'portrait' ? '#7460D9' : 'var(--border)'}`,
                    background: selectedTarget === 'portrait' ? 'rgba(116, 96, 217, 0.15)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                  onClick={() => setSelectedTarget('portrait')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#fff' }}>
                    <Smartphone size={18} color="#F4C35E" /> Portrait (9:16)
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    1080 × 1920 @ 30 FPS<br />
                    Best for Reels, TikTok, Shorts
                  </div>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: `2px solid ${selectedTarget === 'landscape' ? '#7460D9' : 'var(--border)'}`,
                    background: selectedTarget === 'landscape' ? 'rgba(116, 96, 217, 0.15)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                  onClick={() => setSelectedTarget('landscape')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#fff' }}>
                    <Monitor size={18} color="#F4C35E" /> Landscape (16:9)
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    1920 × 1080 @ 30 FPS<br />
                    Best for YouTube & Websites
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 8, fontSize: 12, color: '#94a3b8' }}>
                <strong>Render Pipeline:</strong> Pure offline Chrome frame capture → direct FFmpeg pipe → libx264 (yuv420p) + AAC audio muxing → ffprobe verification.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                  Rendering {job.targetId.toUpperCase()} ({job.status.toUpperCase()})
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#F4C35E' }}>
                  {job.percent}%
                </div>
              </div>

              <div className="progress-bar-wrapper">
                <div className="progress-bar-fill" style={{ width: `${job.percent}%` }} />
              </div>

              {job.status === 'done' && job.metadata && (
                <div
                  style={{
                    padding: 14,
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12
                  }}
                >
                  <CheckCircle2 size={24} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#10b981' }}>
                      Render Complete & Verified!
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                      <div>Resolution: <strong>{job.metadata.width} × {job.metadata.height}</strong></div>
                      <div>Frame Rate: <strong>{job.metadata.fps} FPS</strong></div>
                      <div>Duration: <strong>{job.metadata.duration.toFixed(2)}s</strong></div>
                      <div>Total Frames: <strong>{job.metadata.frameCount}</strong></div>
                      <div>Video Codec: <strong>{job.metadata.videoCodec.toUpperCase()}</strong></div>
                      <div>File Size: <strong>{(job.metadata.fileSize / 1024).toFixed(1)} KB</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {job.status === 'failed' && (
                <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>
                  <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                  {job.error || 'Rendering encountered an error.'}
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  <Terminal size={12} /> Render Execution Logs
                </div>
                <div className="logs-terminal">
                  {(job.logs || []).map((l, i) => (
                    <div key={i} className="log-line">
                      &gt; {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!job ? (
            <>
              <button className="btn btn-secondary" onClick={onClose} disabled={isStarting}>
                Cancel
              </button>
              <button className="btn btn-accent" onClick={handleStartRender} disabled={isStarting}>
                <Sparkles size={14} /> {isStarting ? 'Starting...' : 'Start MP4 Render'}
              </button>
            </>
          ) : job.status === 'done' ? (
            <>
              <button className="btn btn-secondary" onClick={() => setJob(null)}>
                Render Another Format
              </button>
              <a
                href={getDownloadUrl(job.id)}
                download={job.outputFileName}
                className="btn btn-accent"
                style={{ textDecoration: 'none' }}
              >
                <Download size={14} /> Download MP4 ({job.outputFileName})
              </a>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={onClose} disabled={job.status === 'rendering'}>
              {job.status === 'rendering' ? 'Rendering in Progress...' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

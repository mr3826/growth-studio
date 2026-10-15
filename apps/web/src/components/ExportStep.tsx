import React, { useState, useEffect, useRef } from 'react';
import { Project, RenderJob, ExportRecord } from '../types';
import {
  queueRender,
  fetchRenderJob,
  cancelRender,
  getDownloadUrl,
  getStreamUrl,
  fetchProjectExports
} from '../api';
import {
  DownloadCloud,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Terminal,
  Download,
  Film,
  HardDrive,
  ArrowLeft,
  Home,
  Play,
  RefreshCw,
  Video
} from 'lucide-react';

interface ExportStepProps {
  project: Project;
  onBack: () => void;
  onGoHome: () => void;
}

export const ExportStep: React.FC<ExportStepProps> = ({
  project,
  onBack,
  onGoHome
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('portrait');
  const [currentJob, setCurrentJob] = useState<RenderJob | null>(null);
  const [isQueueing, setIsQueueing] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const pollIntervalRef = useRef<any>(null);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetchProjectExports(project.project.id);
      setExportHistory(res.exports || []);
    } catch (err) {
      console.warn('Failed to load export history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [project.project.id]);

  // Poll render job status when rendering
  useEffect(() => {
    if (!currentJob?.id) return;
    if (['done', 'failed', 'cancelled'].includes(currentJob.status)) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (currentJob.status === 'done') {
        loadHistory();
      }
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const updated = await fetchRenderJob(currentJob.id);
        setCurrentJob(updated);
        setLogs(updated.logs || []);
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
        if (updated.status === 'done') {
          loadHistory();
        }
      } catch (err) {
        console.error('Failed to poll render job:', err);
      }
    }, 1000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [currentJob?.id, currentJob?.status]);

  const handleStartExport = async () => {
    setIsQueueing(true);
    setLogs([`Saving latest project state & queueing export for target ${selectedTarget}...`]);
    try {
      // Pass latest project state to ensure synchronous server-side save before render starts
      const res = await queueRender(project.project.id, selectedTarget, project);
      const initialJob = await fetchRenderJob(res.jobId);
      setCurrentJob(initialJob);
      setPreviewVideoUrl(null);
    } catch (err: any) {
      alert(`Export queue failed: ${err.message}`);
    } finally {
      setIsQueueing(false);
    }
  };

  const handleCancelExport = async () => {
    if (!currentJob) return;
    if (!confirm('Are you sure you want to cancel the active render?')) return;
    try {
      await cancelRender(currentJob.id);
      const updated = await fetchRenderJob(currentJob.id);
      setCurrentJob(updated);
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatTargetLabel = (targetId: string) => {
    switch (targetId) {
      case 'portrait':
        return '9:16 Vertical Reel';
      case 'landscape':
        return '16:9 Widescreen';
      case 'portrait_4_5':
        return '4:5 Feed Standard';
      default:
        return targetId;
    }
  };

  return (
    <div className="step-container export-step-view">
      <div className="step-header">
        <h2 className="step-title">Step 7: Render Offline Video & Export Queue</h2>
        <p className="step-subtitle">
          Export verified H.264 / AAC MP4 files directly to your fast local drive using the Chromium-FFmpeg direct pipe.
        </p>
      </div>

      <div className="export-grid-layout">
        {/* Left: Export Configuration & Trigger */}
        <div className="export-control-card">
          <h3 className="section-title mb-4">Export Settings</h3>

          <div className="form-group mb-6">
            <label className="form-label">Select Output Target</label>
            <div className="target-radio-stack">
              <label className={`target-radio-box ${selectedTarget === 'portrait' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="target"
                  value="portrait"
                  checked={selectedTarget === 'portrait'}
                  onChange={() => setSelectedTarget('portrait')}
                />
                <div className="radio-content">
                  <strong>9:16 Vertical Reel (1080 × 1920 @ 30 FPS)</strong>
                  <span className="text-emerald-400">Recommended • Primary format for BD mobile & Reels</span>
                </div>
              </label>

              <label className={`target-radio-box ${selectedTarget === 'landscape' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="target"
                  value="landscape"
                  checked={selectedTarget === 'landscape'}
                  onChange={() => setSelectedTarget('landscape')}
                />
                <div className="radio-content">
                  <strong>16:9 Widescreen (1920 × 1080 @ 30 FPS)</strong>
                  <span>Desktop & YouTube video adaptation</span>
                </div>
              </label>

              <label className={`target-radio-box ${selectedTarget === 'portrait_4_5' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="target"
                  value="portrait_4_5"
                  checked={selectedTarget === 'portrait_4_5'}
                  onChange={() => setSelectedTarget('portrait_4_5')}
                />
                <div className="radio-content">
                  <strong>4:5 Feed Standard (1080 × 1350 @ 25 FPS)</strong>
                  <span>Facebook Feed video specification</span>
                </div>
              </label>
            </div>
          </div>

          <div className="storage-note-box mb-6">
            <HardDrive className="w-5 h-5 text-emerald-400 mr-2 flex-shrink-0" />
            <div className="text-xs">
              <strong>Storage Target: E:\GrowthStudio\exports</strong>
              <p className="opacity-80">Render scratch files, frame buffers and finished MP4s are stored on E: drive.</p>
            </div>
          </div>

          <button
            onClick={handleStartExport}
            disabled={isQueueing || (currentJob && ['queued', 'validating', 'rendering', 'encoding', 'verifying'].includes(currentJob.status))}
            className="btn-primary w-full py-3.5 text-base"
          >
            <Film className="w-5 h-5 mr-2" />
            <span>{isQueueing ? 'Saving & Starting Pipeline...' : 'Start MP4 Video Export'}</span>
          </button>
        </div>

        {/* Right: Job Progress & Verification */}
        <div className="export-status-card">
          <div className="card-header flex-between mb-4">
            <h3 className="card-title">Job Status</h3>
            {currentJob && (
              <span className={`status-pill status-${currentJob.status}`}>
                {currentJob.status.toUpperCase()}
              </span>
            )}
          </div>

          {!currentJob ? (
            <div className="export-idle-state">
              <DownloadCloud className="w-12 h-12 text-slate-500 mb-3" />
              <p className="text-slate-400 text-sm">No export currently active.</p>
              <p className="text-slate-500 text-xs mt-1">Select an aspect ratio on the left and click "Start MP4 Video Export".</p>
            </div>
          ) : (
            <div className="job-active-state">
              {/* Progress Bar */}
              <div className="progress-section mb-6">
                <div className="flex-between text-xs mb-1.5 font-bold">
                  <span>
                    {currentJob.status === 'validating' ? 'Preflight & Space Check...' :
                     currentJob.status === 'rendering' ? `Frame Progress: ${currentJob.currentFrame || 0} / ${currentJob.totalFrames || 0}` :
                     currentJob.status === 'encoding' ? 'FFmpeg Encoding Stream...' :
                     currentJob.status === 'verifying' ? 'Verifying Decode & Audio...' :
                     currentJob.status === 'done' ? 'Render & Decode Verified' :
                     currentJob.status.toUpperCase()}
                  </span>
                  <span className="text-emerald-400">{currentJob.percent || 0}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${currentJob.percent || 0}%` }}></div>
                </div>
              </div>

              {/* Status Actions */}
              {['queued', 'validating', 'rendering', 'encoding', 'verifying'].includes(currentJob.status) && (
                <div className="mb-4">
                  <button onClick={handleCancelExport} className="btn-secondary text-rose-400 border-rose-500/30 hover:bg-rose-950/40 w-full">
                    <XCircle className="w-4 h-4 mr-1 text-rose-400" />
                    <span>Cancel Active Render</span>
                  </button>
                </div>
              )}

              {/* Verified Output Card & In-App Video Player */}
              {currentJob.status === 'done' && currentJob.metadata && (
                <div className="verified-output-card mb-6">
                  <div className="verified-header">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <strong>ffprobe & FFmpeg Null-Decode Verified Output</strong>
                  </div>

                  {/* Immediate in-browser MP4 player */}
                  <div className="export-video-player-box">
                    <video
                      key={currentJob.id}
                      controls
                      autoPlay={false}
                      src={getStreamUrl(currentJob.id)}
                      className="w-full"
                    >
                      Your browser does not support HTML5 video streaming.
                    </video>
                  </div>

                  <div className="verified-meta-grid">
                    <div><small>Dimensions</small><strong>{currentJob.metadata.width} × {currentJob.metadata.height}</strong></div>
                    <div><small>Framerate</small><strong>{currentJob.metadata.fps} FPS</strong></div>
                    <div><small>Duration</small><strong>{currentJob.metadata.duration.toFixed(2)}s</strong></div>
                    <div><small>Video / Audio</small><strong>{currentJob.metadata.videoCodec} / {currentJob.metadata.audioCodec}</strong></div>
                    <div><small>File Size</small><strong>{formatFileSize(currentJob.metadata.fileSize)}</strong></div>
                    <div><small>Output Path</small><strong className="truncate text-xs">{currentJob.outputFileName}</strong></div>
                  </div>

                  <a
                    href={getDownloadUrl(currentJob.id)}
                    download={currentJob.outputFileName}
                    className="btn-primary w-full mt-4 flex items-center justify-center py-3"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    <span>Download {currentJob.outputFileName}</span>
                  </a>
                </div>
              )}

              {/* Failure Alert */}
              {currentJob.status === 'failed' && (
                <div className="failed-alert-box mb-4">
                  <AlertCircle className="w-5 h-5 text-rose-400 mr-2 flex-shrink-0" />
                  <div>
                    <strong>Render Failed</strong>
                    <p className="text-xs opacity-90">{currentJob.error}</p>
                  </div>
                </div>
              )}

              {/* Cancelled Alert */}
              {currentJob.status === 'cancelled' && (
                <div className="cancelled-alert-box mb-4">
                  <XCircle className="w-5 h-5 text-amber-400 mr-2 flex-shrink-0" />
                  <div>
                    <strong>Render Cancelled</strong>
                    <p className="text-xs opacity-90">Child processes terminated, partial files and scratch buffers cleaned.</p>
                  </div>
                </div>
              )}

              {/* Real-time Terminal Logs */}
              <div className="logs-terminal-box">
                <div className="terminal-header">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pipeline Diagnostics</span>
                </div>
                <div ref={logContainerRef} className="terminal-body">
                  {logs.map((log, i) => (
                    <div key={i} className="terminal-line">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Export History Section */}
      <div className="export-history-card">
        <div className="export-history-header">
          <div>
            <h3 className="card-title flex items-center gap-2">
              <Video className="w-5 h-5 text-emerald-400" />
              <span>Project Export History</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Completed MP4s saved to disk (persists across server restarts).
            </p>
          </div>
          <button
            onClick={loadHistory}
            disabled={loadingHistory}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Modal Video Player if an older export is clicked */}
        {previewVideoUrl && (
          <div className="export-video-player-box mb-4 p-2 bg-slate-950">
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-xs font-semibold text-slate-300">Playing Historical Video:</span>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="text-xs text-rose-400 hover:underline"
              >
                Close Player
              </button>
            </div>
            <video
              controls
              autoPlay
              src={previewVideoUrl}
              className="w-full rounded"
              style={{ maxHeight: '360px' }}
            >
              Your browser does not support HTML5 video playback.
            </video>
          </div>
        )}

        {exportHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No completed exports found yet for this project. Completed renders will appear here with instant in-browser playback and direct download.
          </div>
        ) : (
          <div className="export-history-table-container">
            <table className="export-history-table">
              <thead>
                <tr>
                  <th>Format</th>
                  <th>Filename</th>
                  <th>Dimensions & FPS</th>
                  <th>Duration</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exportHistory.map((exp) => (
                  <tr key={exp.jobId}>
                    <td>
                      <span className="history-badge">{formatTargetLabel(exp.targetId)}</span>
                    </td>
                    <td className="font-mono text-xs">{exp.outputFileName}</td>
                    <td>{exp.width} × {exp.height} @ {exp.fps}fps</td>
                    <td>{exp.duration.toFixed(1)}s</td>
                    <td>{formatFileSize(exp.fileSize)}</td>
                    <td className="text-slate-400 text-xs">
                      {new Date(exp.completedAt || exp.createdAt).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-2">
                        {exp.fileExists ? (
                          <>
                            <button
                              onClick={() => setPreviewVideoUrl(exp.streamUrl)}
                              className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                              title="Play Video in Browser"
                            >
                              <Play className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Play</span>
                            </button>
                            <a
                              href={exp.downloadUrl}
                              download={exp.outputFileName}
                              className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
                              title="Download MP4 File"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          </>
                        ) : (
                          <span className="text-xs text-rose-400">File missing from disk</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="step-navigation-bar">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to Preview</span>
        </button>
        <button onClick={onGoHome} className="btn-secondary">
          <Home className="w-4 h-4 mr-1" />
          <span>Project Home</span>
        </button>
      </div>
    </div>
  );
};

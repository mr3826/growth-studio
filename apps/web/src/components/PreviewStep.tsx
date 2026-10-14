import React, { useState, useEffect, useRef } from 'react';
import { Project, PreflightReport } from '../types';
import { fetchPreflight } from '../api';
import {
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  HardDrive,
  Clock,
  ArrowRight,
  ArrowLeft,
  Maximize2
} from 'lucide-react';

interface PreviewStepProps {
  project: Project;
  onBack: () => void;
  onProceedToExport: () => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  project,
  onBack,
  onProceedToExport
}) => {
  const [targetId, setTargetId] = useState<string>('portrait_4_5');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [preflight, setPreflight] = useState<PreflightReport | null>(null);
  const [isLoadingPreflight, setIsLoadingPreflight] = useState<boolean>(true);
  const [showSafeArea, setShowSafeArea] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Run preflight check
  useEffect(() => {
    let mounted = true;
    setIsLoadingPreflight(true);
    fetchPreflight(project.project.id)
      .then(report => {
        if (mounted) {
          setPreflight(report);
          setTotalDuration(report.totalDuration);
          setIsLoadingPreflight(false);
        }
      })
      .catch(err => {
        if (mounted) {
          console.error('Preflight error:', err);
          setIsLoadingPreflight(false);
        }
      });

    return () => { mounted = false; };
  }, [project]);

  // Handle postMessage events from iframe player
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === 'KINETIC_TIMEUPDATE') {
        setCurrentTime(e.data.currentTime);
        if (e.data.totalDuration) setTotalDuration(e.data.totalDuration);
      } else if (e.data.type === 'KINETIC_PLAYING') {
        setIsPlaying(e.data.isPlaying);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const togglePlay = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'KINETIC_TOGGLE' }, '*');
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'KINETIC_SEEK', time }, '*');
  };

  const toggleSafeArea = () => {
    setShowSafeArea(!showSafeArea);
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'KINETIC_TOGGLE_SAFE_AREA' }, '*');
  };

  const previewUrl = `/api/projects/${project.project.id}/preview-html?target=${targetId}&t=${Date.now()}`;

  // Dimensions for preview container based on target
  let containerAspect = '4 / 5';
  if (targetId === 'portrait') containerAspect = '9 / 16';
  else if (targetId === 'landscape') containerAspect = '16 / 9';

  return (
    <div className="step-container preview-step-view">
      <div className="step-header flex-between">
        <div>
          <h2 className="step-title">Step 6: Live Timeline Preview & Preflight Verification</h2>
          <p className="step-subtitle">
            Experience real-time kinetic motion, responsive aspect reflow, and verify offline render readiness.
          </p>
        </div>
        <div className="target-switcher-pills">
          <button
            onClick={() => setTargetId('portrait_4_5')}
            className={`target-pill ${targetId === 'portrait_4_5' ? 'active' : ''}`}
          >
            4:5 Reference Standard
          </button>
          <button
            onClick={() => setTargetId('portrait')}
            className={`target-pill ${targetId === 'portrait' ? 'active' : ''}`}
          >
            9:16 Vertical Reel
          </button>
          <button
            onClick={() => setTargetId('landscape')}
            className={`target-pill ${targetId === 'landscape' ? 'active' : ''}`}
          >
            16:9 Landscape
          </button>
        </div>
      </div>

      <div className="preview-split-layout">
        {/* Left: Player Stage */}
        <div className="player-stage-card">
          <div className="player-viewport-wrapper" style={{ aspectRatio: containerAspect }}>
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="player-iframe"
              title="Kinetic Preview Player"
            />
          </div>

          {/* Timeline Playback Bar */}
          <div className="player-controls-bar">
            <button onClick={togglePlay} className="btn-icon play-btn" title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <span className="time-display">
              {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
            </span>

            <input
              type="range"
              min="0"
              max={totalDuration || 10}
              step="0.05"
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="timeline-scrubber"
            />

            <button
              onClick={toggleSafeArea}
              className={`btn-icon ${showSafeArea ? 'active-tool' : ''}`}
              title="Toggle Safe Area Guides"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Preflight & Storage Diagnostic */}
        <div className="preflight-diagnostics-card">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <span>Preflight Diagnostic Report</span>
          </h3>

          {isLoadingPreflight ? (
            <div className="p-6 text-center text-slate-400">Verifying timeline and storage...</div>
          ) : (
            <div className="preflight-report-content">
              <div className={`status-banner ${preflight?.passed ? 'passed' : 'failed'}`}>
                {preflight?.passed ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-rose-400" />
                )}
                <div>
                  <strong>{preflight?.passed ? 'Preflight Verification Passed' : 'Preflight Issues Found'}</strong>
                  <p className="text-xs opacity-80">
                    {preflight?.passed
                      ? 'Composition conforms to schema, fonts and timelines are valid.'
                      : 'Resolve the errors below before exporting.'}
                  </p>
                </div>
              </div>

              {/* Storage Info */}
              {preflight?.storage && (
                <div className="storage-diagnostic-box mt-4">
                  <div className="storage-header">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <strong>Local Storage: {preflight.storage.root}</strong>
                  </div>
                  <div className="storage-metrics-row">
                    <div>
                      <small>Available Free</small>
                      <strong>{preflight.storage.freeGB} GB</strong>
                    </div>
                    <div>
                      <small>Estimated MP4 Need</small>
                      <strong>{(preflight.storage.estimatedNeededGB || 0.2).toFixed(2)} GB</strong>
                    </div>
                    <div>
                      <small>E: Drive Target</small>
                      <strong className="text-emerald-400">{preflight.storage.isEDrive ? 'YES (Verified)' : 'NO'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors / Warnings */}
              {preflight?.errors && preflight.errors.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-bold text-rose-400">ERRORS ({preflight.errors.length})</span>
                  <ul className="text-xs text-rose-300 mt-1 space-y-1">
                    {preflight.errors.map((err, i) => (
                      <li key={i}>❌ {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preflight?.warnings && preflight.warnings.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-bold text-amber-400">WARNINGS ({preflight.warnings.length})</span>
                  <ul className="text-xs text-amber-300 mt-1 space-y-1">
                    {preflight.warnings.map((w, i) => (
                      <li key={i}>⚠️ {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={onProceedToExport}
                  disabled={!preflight?.passed}
                  className="btn-primary w-full py-3"
                >
                  <span>Proceed to Export Video</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="step-navigation-bar">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to Motion & Mockups</span>
        </button>
        <button
          onClick={onProceedToExport}
          disabled={!preflight?.passed}
          className="btn-primary"
        >
          <span>Next: Export Video</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

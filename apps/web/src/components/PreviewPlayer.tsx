import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Shield, Smartphone, Monitor } from 'lucide-react';
import { getPreviewHtmlUrl } from '../api';

interface PreviewPlayerProps {
  projectId: string;
  targetId: 'portrait' | 'landscape';
  onChangeTarget: (target: 'portrait' | 'landscape') => void;
  refreshTrigger: number;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  projectId,
  targetId,
  onChangeTarget,
  refreshTrigger
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(10);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(300);
  const [showSafeArea, setShowSafeArea] = useState(false);

  const previewUrl = getPreviewHtmlUrl(projectId, targetId) + `&r=${refreshTrigger}`;

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === 'KINETIC_TIMEUPDATE') {
        setCurrentTime(e.data.currentTime || 0);
        if (e.data.totalDuration) setTotalDuration(e.data.totalDuration);
        if (e.data.frame !== undefined) setCurrentFrame(e.data.frame);
        if (e.data.totalFrames) setTotalFrames(e.data.totalFrames);
      } else if (e.data.type === 'KINETIC_PLAYING') {
        setIsPlaying(e.data.isPlaying);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTogglePlay = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'KINETIC_TOGGLE' }, '*');
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'KINETIC_SEEK', time: newTime }, '*');
    }
  };

  const handleToggleSafeArea = () => {
    setShowSafeArea(!showSafeArea);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'KINETIC_TOGGLE_SAFE_AREA' }, '*');
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl + `&_ts=${Date.now()}`;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  };

  return (
    <section className="preview-section">
      <div className="preview-top-toolbar">
        <div className="aspect-switcher">
          <button
            className={`aspect-btn ${targetId === 'portrait' ? 'active' : ''}`}
            onClick={() => onChangeTarget('portrait')}
            title="Portrait 9:16 (1080x1920)"
          >
            <Smartphone size={14} /> 9:16 Portrait
          </button>
          <button
            className={`aspect-btn ${targetId === 'landscape' ? 'active' : ''}`}
            onClick={() => onChangeTarget('landscape')}
            title="Landscape 16:9 (1920x1080)"
          >
            <Monitor size={14} /> 16:9 Landscape
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn btn-secondary btn-sm ${showSafeArea ? 'active' : ''}`}
            onClick={handleToggleSafeArea}
            title="Toggle Safe Margins Guide"
          >
            <Shield size={14} color={showSafeArea ? '#F4C35E' : '#94a3b8'} /> Safe Area
          </button>
          <button className="btn-icon" onClick={handleRefresh} title="Reload Preview">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="canvas-container">
        <div className={`preview-frame-wrapper ${targetId}`}>
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="preview-iframe"
            title="Kinetic Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>

      <div className="playback-bar">
        <button className="play-toggle-btn" onClick={handleTogglePlay} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
        </button>

        <div className="timecode-display">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>

        <div className="scrubber-container">
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.033}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="scrubber-slider"
          />
        </div>

        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
          F {currentFrame} / {totalFrames} (30 FPS)
        </div>
      </div>
    </section>
  );
};

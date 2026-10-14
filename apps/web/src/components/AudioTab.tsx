import React, { useState } from 'react';
import { Project } from '../types';
import { Music, Volume2, Mic, Play, RefreshCw, Sliders, CheckCircle2 } from 'lucide-react';
import { previewNarration, generateNarration, fitScenesToAudio } from '../api';

interface AudioTabProps {
  project: Project;
  onChange: (updated: Project) => void;
}

export const AudioTab: React.FC<AudioTabProps> = ({ project, onChange }) => {
  const audio = project.audio || {};
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isFitting, setIsFitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const updateAudio = (field: string, val: any) => {
    onChange({
      ...project,
      audio: {
        ...project.audio,
        [field]: val
      }
    });
  };

  const updateNarration = (field: string, val: any) => {
    onChange({
      ...project,
      audio: {
        ...project.audio,
        narration: {
          ...(project.audio?.narration || {}),
          [field]: val
        }
      }
    });
  };

  const musicAssets = (project.assets || []).filter((a) => a.kind === 'music');
  const voiceAssets = (project.assets || []).filter((a) => a.kind === 'voice');

  const selectedVoice = audio.narration?.voice || 'Puck';
  const audioMode = audio.muteAll ? 'silent' : (audio.mode || 'voice_and_music');

  const handleTestVoice = async () => {
    setIsPlayingPreview(true);
    setStatusMessage('Generating voice sample...');
    try {
      const sampleText = project.project.language === 'bn'
        ? 'গ্রোথ স্টুডিওতে স্বাগতম। আপনার প্রমোশনাল ভিডিও তৈরি করুন নিমেষেই।'
        : 'Welcome to Growth Studio. Create professional promotional videos with audible voiceover.';
      const blob = await previewNarration(sampleText, selectedVoice);
      const url = URL.createObjectURL(blob);
      const sound = new Audio(url);
      sound.onended = () => {
        setIsPlayingPreview(false);
        setStatusMessage(null);
      };
      await sound.play();
      setStatusMessage('Playing sample audio ✓');
    } catch (err: any) {
      alert(`Voice preview failed: ${err.message}`);
      setIsPlayingPreview(false);
      setStatusMessage(null);
    }
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    setStatusMessage('Generating voiceover for all scenes with Gemini TTS...');
    try {
      const res = await generateNarration(project.project.id, {
        allScenes: true,
        voice: selectedVoice,
        fitDuration: true
      });
      if (res.success && res.project) {
        onChange(res.project);
        setStatusMessage(`Generated ${res.generated.length} scene voiceovers! ✓`);
      }
    } catch (err: any) {
      alert(`Voice generation failed: ${err.message}`);
      setStatusMessage(null);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleFitScenes = async () => {
    setIsFitting(true);
    try {
      const res = await fitScenesToAudio(project.project.id, 0.5);
      if (res.success && res.scenes) {
        onChange({ ...project, scenes: res.scenes });
        setStatusMessage('Scene durations synchronized to audio ✓');
      }
    } catch (err: any) {
      alert(`Auto-fit failed: ${err.message}`);
    } finally {
      setIsFitting(false);
    }
  };

  return (
    <div className="inspector-body">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#F4C35E' }}>
        <Music size={14} /> Audio Studio & Voiceover Pipeline
      </div>

      {statusMessage && (
        <div style={{ padding: '8px 12px', background: 'rgba(116,96,217,0.15)', border: '1px solid #7460D9', borderRadius: 6, fontSize: 12, color: '#e2e8f0' }}>
          {statusMessage}
        </div>
      )}

      {/* Audio Mode */}
      <div className="form-group">
        <label className="form-label">Audio Production Mode</label>
        <select
          className="form-select"
          value={audioMode}
          onChange={(e) => {
            const mode = e.target.value;
            if (mode === 'silent') {
              updateAudio('muteAll', true);
              updateAudio('mode', 'silent');
            } else {
              updateAudio('muteAll', false);
              updateAudio('mode', mode);
            }
          }}
        >
          <option value="voice_and_music">Voiceover + Ducked Background Music (Recommended)</option>
          <option value="generated_voice">AI Voiceover Only (Speech)</option>
          <option value="imported_voice">Custom Imported Voiceover Only</option>
          <option value="music_only">Background Music Only (No Narration)</option>
          <option value="silent">Explicitly Silent Video (Zero Audio)</option>
        </select>
      </div>

      {audioMode !== 'silent' && (
        <>
          {/* Gemini AI Voiceover Settings */}
          {(audioMode === 'voice_and_music' || audioMode === 'generated_voice') && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mic size={14} /> Gemini AI Voice Narration
                </span>
                <span style={{ fontSize: 10, background: 'rgba(56,189,248,0.2)', color: '#38BDF8', padding: '2px 6px', borderRadius: 4 }}>
                  ONLINE
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label">Voice Persona</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className="form-select"
                    style={{ flex: 1 }}
                    value={selectedVoice}
                    onChange={(e) => updateNarration('voice', e.target.value)}
                  >
                    <option value="Puck">Puck (Engaging & Crisp - Male)</option>
                    <option value="Charon">Charon (Deep & Authoritative - Male)</option>
                    <option value="Kore">Kore (Warm & Professional - Female)</option>
                    <option value="Fenrir">Fenrir (Energetic & Dynamic - Male)</option>
                    <option value="Aoede">Aoede (Smooth & Melodic - Female)</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleTestVoice}
                    disabled={isPlayingPreview}
                    title="Listen to sample audio"
                  >
                    <Play size={12} /> {isPlayingPreview ? 'Playing...' : 'Test'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={handleGenerateAll}
                  disabled={isGeneratingAll}
                >
                  <RefreshCw size={12} className={isGeneratingAll ? 'animate-spin' : ''} />
                  <span>{isGeneratingAll ? 'Synthesizing...' : 'Generate All Voiceovers'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleFitScenes}
                  disabled={isFitting}
                  title="Extend scene duration to comfortably fit voiceover"
                >
                  Auto-Fit
                </button>
              </div>
            </div>
          )}

          {/* Music Track & Mixing */}
          {(audioMode === 'voice_and_music' || audioMode === 'music_only') && (
            <div className="form-group">
              <label className="form-label">Background Music Track</label>
              <select
                className="form-select"
                value={audio.musicAssetId || ''}
                onChange={(e) => updateAudio('musicAssetId', e.target.value)}
              >
                <option value="">(None - select track)</option>
                {musicAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} ({a.file})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Levels & Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Voice Volume ({Math.round((audio.voiceVolume ?? 1.0) * 100)}%)</label>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={audio.voiceVolume ?? 1.0}
                onChange={(e) => updateAudio('voiceVolume', parseFloat(e.target.value))}
              />
            </div>

            {(audioMode === 'voice_and_music' || audioMode === 'music_only') && (
              <div className="form-group">
                <label className="form-label">Music Volume ({Math.round((audio.musicVolume ?? 0.25) * 100)}%)</label>
                <input
                  type="range"
                  min={0}
                  max={1.0}
                  step={0.05}
                  value={audio.musicVolume ?? 0.25}
                  onChange={(e) => updateAudio('musicVolume', parseFloat(e.target.value))}
                />
              </div>
            )}
          </div>

          {/* Ducking Setting */}
          {audioMode === 'voice_and_music' && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Smart Music Ducking (Sidechain)</span>
                <input
                  type="checkbox"
                  checked={audio.ducking !== false}
                  onChange={(e) => updateAudio('ducking', e.target.checked)}
                />
              </label>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Automatically ducks background music by 12 dB during speech so narration remains loud and crystal clear.
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Music Fade In ({audio.fadeInSeconds ?? 0.4}s)</label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                className="form-input"
                value={audio.fadeInSeconds ?? 0.4}
                onChange={(e) => updateAudio('fadeInSeconds', parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Music Fade Out ({audio.fadeOutSeconds ?? 0.8}s)</label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                className="form-input"
                value={audio.fadeOutSeconds ?? 0.8}
                onChange={(e) => updateAudio('fadeOutSeconds', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: '#64748b' }}>
            <span>Target Loudness: <strong>-16 LUFS (Broadcast Standard)</strong> with FFmpeg Loudnorm master leveling.</span>
          </div>
        </>
      )}
    </div>
  );
};

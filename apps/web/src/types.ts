export interface Project {
  schemaVersion: string;
  project: {
    id: string;
    name: string;
    campaignName?: string;
    language: string;
    clientOrProduct?: string;
    description?: string;
  };
  template: {
    id: string;
    version: string;
    variant?: string;
  };
  creative: {
    objective: string;
    audience: string;
    painPoint?: string;
    keyMessage: string;
    tone: string;
    languageStyle?: string;
    cta: {
      label: string;
      destination: string;
    };
    claimEvidenceNotes?: string;
  };
  brand: {
    name: string;
    tagline?: string;
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    latinFontFamily?: string;
    banglaFontFamily?: string;
    fontWeight?: number;
    cornerRadiusPx?: number;
    stylePreset?: string;
    logoPlacement?: string;
    watermark?: boolean;
  };
  assets: Array<{
    id: string;
    kind: string;
    file: string;
    usageRights?: string;
    fit?: string;
    durationSeconds?: number;
    sampleRate?: number;
    channels?: number;
    source?: string;
    provenance?: any;
  }>;
  targets: Array<{
    id: string;
    width: number;
    height: number;
    fps: number;
    safeMarginPercent?: number;
    fitMode?: string;
  }>;
  scenes: Array<{
    id: string;
    chapterNumber?: number;
    chapterTitle?: string;
    kind: string;
    durationSeconds: number;
    eyebrow?: string;
    headline?: string;
    subheadline?: string;
    body?: string;
    highlightWords?: string[];
    statValue?: string;
    statLabel?: string;
    badge?: string;
    layout?: string;
    deviceFrame?: string;
    mediaAssetIds?: string[];
    narrationText?: string;
    narrationAssetId?: string;
    narrationDurationSeconds?: number;
    callouts?: Array<{
      label: string;
      x?: number;
      y?: number;
      placement?: string;
      delaySeconds?: number;
    }>;
    ctaLabel?: string;
    ctaDestination?: string;
    motion?: {
      entrance?: string;
      emphasis?: string;
      exit?: string;
      easing?: string;
      intensity?: number;
      staggerMilliseconds?: number;
    };
    afterTransition?: string;
    transitionDurationSeconds?: number;
  }>;
  audio?: {
    mode?: 'silent' | 'imported_voice' | 'generated_voice' | 'music_only' | 'voice_and_music';
    muteAll?: boolean;
    musicAssetId?: string;
    musicVolume?: number;
    voiceVolume?: number;
    fadeInSeconds?: number;
    fadeOutSeconds?: number;
    ducking?: boolean;
    duckingDb?: number;
    targetLufs?: number;
    duckMusicUnderVoice?: boolean;
    beatSync?: string;
    narration?: {
      provider?: string;
      model?: string;
      voice?: string;
      language?: string;
      speed?: number;
      style?: string;
    };
    clips?: Array<{
      id: string;
      type: 'voice' | 'music' | 'sfx';
      assetId: string;
      startTime: number;
      duration?: number;
      volume?: number;
      fadeIn?: number;
      fadeOut?: number;
      loop?: boolean;
    }>;
  };
  captions?: {
    enabled?: boolean;
    source?: string;
    position?: string;
    maxWordsPerLine?: number;
  };
  export?: {
    fileStem?: string;
    format?: string;
    videoCodec?: string;
    audioCodec?: string;
    qualityPreset?: string;
    workers?: number;
    useGpuIfAvailable?: boolean;
    overwriteExisting?: boolean;
  };
}

export interface PreflightReport {
  passed: boolean;
  errors: string[];
  warnings: string[];
  totalDuration: number;
  storage?: {
    root: string;
    isEDrive: boolean;
    freeGB: number;
    estimatedNeededGB?: number;
  };
}

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  templateId: string;
  language: string;
}

export interface RenderJob {
  id: string;
  projectId: string;
  targetId: string;
  status: 'queued' | 'validating' | 'rendering' | 'verifying' | 'done' | 'failed' | 'cancelled';
  progress: number;
  currentFrame: number;
  totalFrames: number;
  percent: number;
  outputPath: string;
  outputFileName: string;
  metadata?: {
    width: number;
    height: number;
    duration: number;
    fps: number;
    videoCodec: string;
    audioCodec: string;
    frameCount: number;
    fileSize: number;
  };
  error?: string;
  logs: string[];
  startedAt: string;
  completedAt?: string;
}

export interface NarrationStatus {
  available: boolean;
  provider: string;
  model: string;
  voices: Array<{ id: string; name: string; gender?: string; default?: boolean }>;
  supportedLanguages: Array<{ code: string; name: string }>;
}


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
    kind: string;
    durationSeconds: number;
    eyebrow?: string;
    headline?: string;
    subheadline?: string;
    body?: string;
    highlightWords?: string[];
    layout?: string;
    deviceFrame?: string;
    mediaAssetIds?: string[];
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
    muteAll?: boolean;
    musicAssetId?: string;
    musicVolume?: number;
    fadeInSeconds?: number;
    fadeOutSeconds?: number;
    duckMusicUnderVoice?: boolean;
    beatSync?: string;
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

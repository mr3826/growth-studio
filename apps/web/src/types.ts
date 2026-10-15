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
    productTruthProfile?: Array<{
      id: string;
      category: string;
      statement: string;
      verificationStatus: 'verified_live' | 'approved_demo' | 'planned' | 'unknown';
      isApproved?: boolean;
      proofAssetId?: string;
      notes?: string;
    }>;
    concepts?: Array<{
      id: string;
      angleTitle: string;
      angleType: 'problem_solution' | 'outcome_story' | 'product_proof' | 'educational' | 'direct_response';
      hookText: string;
      targetPain: string;
      treatment: string;
      suggestedDuration: number;
      suggestedTemplateId: 'bold_kinetic' | 'guided_product_story' | 'app_showcase';
      sceneOutline: Array<{
        sceneNumber: number;
        role: string;
        summary: string;
      }>;
      voiceStyle: string;
      riskNotes: string;
      creativeRationale: string;
    }>;
    selectedConceptId?: string;
    creativeAudit?: {
      hookScore: number;
      benefitsScore: number;
      factsScore: number;
      brandScore: number;
      pacingScore: number;
      mobileLegibilityScore: number;
      languageScore: number;
      overallScore: number;
      summary: string;
      suggestions: Array<{
        category: 'hook' | 'headline' | 'narration' | 'pacing' | 'motion' | 'claims' | 'cta';
        severity: 'high' | 'medium' | 'low' | 'info';
        targetSceneId: string;
        currentText: string;
        proposedText: string;
        rationale: string;
      }>;
      auditedAt?: string;
      model?: string;
    };
    conceptsGeneratedAt?: string;
    conceptsModel?: string;
    prohibitedPhrases?: string[];
    benefits?: string[];
    category?: string;
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
      transition?: string;
      cameraPreset?: string;
      easing?: string;
      intensity?: number;
      staggerMilliseconds?: number;
    };
    afterTransition?: string;
    transitionDurationSeconds?: number;
    approvalStatus?: 'draft' | 'approved' | 'locked';
    isApproved?: boolean;
    pronunciationNotes?: string;
    claims?: Array<{ claimText: string; evidenceId?: string; proofAssetId?: string; status?: string }>;
    narrationLanguage?: 'bn' | 'en' | 'mixed';
    provenance?: any;
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
  status: 'queued' | 'validating' | 'rendering' | 'encoding' | 'verifying' | 'done' | 'failed' | 'cancelled';
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
    frameCount?: number;
    fileSize: number;
    audioMetrics?: any;
  };
  error?: string;
  logs: string[];
  startedAt: string;
  completedAt?: string;
}

export interface ExportRecord {
  jobId: string;
  projectId: string;
  targetId: string;
  outputFileName: string;
  outputPath: string;
  fileSize: number;
  duration: number;
  fps: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string;
  audioMetrics?: any;
  status: string;
  createdAt: string;
  completedAt: string;
  fileExists: boolean;
  downloadUrl: string;
  streamUrl: string;
}

export interface NarrationStatus {
  available: boolean;
  provider: string;
  model: string;
  voices: Array<{ id: string; name: string; gender?: string; default?: boolean }>;
  supportedLanguages: Array<{ code: string; name: string }>;
}

export interface ProductTruthItem {
  id: string;
  category: string;
  statement: string;
  verificationStatus: 'verified_live' | 'approved_demo' | 'planned' | 'unknown';
  isApproved?: boolean;
  proofAssetId?: string;
  notes?: string;
}

export interface CreativeConcept {
  id: string;
  angleTitle: string;
  angleType: 'problem_solution' | 'outcome_story' | 'product_proof' | 'educational' | 'direct_response';
  hookText: string;
  targetPain: string;
  treatment: string;
  suggestedDuration: number;
  suggestedTemplateId: 'bold_kinetic' | 'guided_product_story' | 'app_showcase';
  sceneOutline: Array<{
    sceneNumber: number;
    role: string;
    summary: string;
  }>;
  voiceStyle: string;
  riskNotes: string;
  creativeRationale: string;
}

export interface CreativeSuggestion {
  category: 'hook' | 'headline' | 'narration' | 'pacing' | 'motion' | 'claims' | 'cta';
  severity: 'high' | 'medium' | 'low' | 'info';
  targetSceneId: string;
  currentText: string;
  proposedText: string;
  rationale: string;
}

export interface CreativeAudit {
  hookScore: number;
  benefitsScore: number;
  factsScore: number;
  brandScore: number;
  pacingScore: number;
  mobileLegibilityScore: number;
  languageScore: number;
  motionVarietyScore?: number;
  audioSyncScore?: number;
  ctaScore?: number;
  overallScore: number;
  summary: string;
  suggestions: CreativeSuggestion[];
  auditedAt?: string;
  model?: string;
}

export interface CreativeProviderStatus {
  configured: boolean;
  provider: string;
  models: Array<{ id: string; name: string; defaultFor?: string }>;
  activeModel: string;
  budgetCapUsd: number;
  offline: boolean;
}

export interface CreativeUsageReceipt {
  id: string;
  timestamp: string;
  task: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  cached: boolean;
  durationMs: number;
}

export interface CreativeUsage {
  projectId: string;
  budgetCapUsd: number;
  totalSpentUsd: number;
  totalCalls: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  remainingBudgetUsd: number;
  isOverBudget: boolean;
  receipts: CreativeUsageReceipt[];
}


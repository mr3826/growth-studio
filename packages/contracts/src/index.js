import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, 'kinetic-project.schema.json');
const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validateSchema = ajv.compile(schemaContent);

export function validateProjectSchema(data) {
  const valid = validateSchema(data);
  if (!valid) {
    return {
      valid: false,
      errors: validateSchema.errors.map(err => ({
        instancePath: err.instancePath,
        schemaPath: err.schemaPath,
        keyword: err.keyword,
        params: err.params,
        message: err.message
      }))
    };
  }
  return { valid: true, errors: [] };
}

export * from './storage.js';

export function createBlankProject(name = 'My Video Project', language = 'en') {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'promo';
  return {
    schemaVersion: '1.0',
    project: {
      id: slug,
      name,
      language
    },
    template: {
      id: 'bold_kinetic',
      version: '1.0.0',
      variant: 'default'
    },
    creative: {
      objective: 'product_launch',
      audience: '',
      keyMessage: 'Add a clear message about your product, service, or brand.',
      tone: 'bold',
      cta: {
        label: '',
        destination: ''
      }
    },
    brand: {
      name: 'Your Brand',
      tagline: '',
      primaryColor: '#7460D9',
      backgroundColor: '#17223B',
      textColor: '#FFFFFF',
      accentColor: '#F4C35E',
      latinFontFamily: 'Inter',
      banglaFontFamily: 'Noto Sans Bengali',
      fontWeight: 800,
      cornerRadiusPx: 16,
      stylePreset: 'bold_future',
      logoPlacement: 'outro',
      watermark: false
    },
    assets: [],
    targets: [
      {
        id: 'portrait_4_5',
        width: 1080,
        height: 1350,
        fps: 25,
        safeMarginPercent: 8,
        fitMode: 'reflow'
      },
      {
        id: 'portrait',
        width: 1080,
        height: 1920,
        fps: 30,
        safeMarginPercent: 9,
        fitMode: 'reflow'
      },
      {
        id: 'landscape',
        width: 1920,
        height: 1080,
        fps: 30,
        safeMarginPercent: 7,
        fitMode: 'reflow'
      }
    ],
    scenes: [
      {
        id: 'hook',
        kind: 'kinetic_text',
        durationSeconds: 4,
        eyebrow: 'YOUR STORY',
        headline: 'Write your opening hook',
        subheadline: 'Add a product message supported by your own evidence.',
        highlightWords: [],
        layout: 'centered',
        motion: {
          entrance: 'stagger_words',
          emphasis: 'highlight',
          exit: 'fade',
          easing: 'spring',
          intensity: 0.8,
          staggerMilliseconds: 70
        },
        afterTransition: 'crossfade',
        transitionDurationSeconds: 0.3
      },
      {
        id: 'cta',
        kind: 'cta',
        durationSeconds: 4,
        headline: 'Add a clear next step',
        subheadline: '',
        ctaLabel: '',
        ctaDestination: '',
        layout: 'centered',
        motion: {
          entrance: 'scale_pop',
          exit: 'fade',
          easing: 'ease_out'
        }
      }
    ],
    audio: {
      mode: 'silent',
      muteAll: false,
      musicAssetId: null,
      musicVolume: 0.25,
      voiceoverAssetId: null,
      voiceoverVolume: 1.0,
      fadeInSeconds: 0.5,
      fadeOutSeconds: 0.8,
      duckMusicUnderVoice: true,
      duckingDb: -12,
      targetLufs: -16,
      narration: {
        provider: 'gemini',
        language: language === 'bn' ? 'bn' : 'en',
        voice: 'Puck',
        speed: 1.0
      },
      clips: []
    },
    captions: {
      enabled: false,
      source: 'scene_text',
      position: 'bottom',
      maxWordsPerLine: 5
    },
    export: {
      fileStem: slug,
      format: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      qualityPreset: 'standard',
      workers: 1,
      useGpuIfAvailable: false,
      overwriteExisting: true,
      includeProjectArchive: false,
      includeThumbnail: true,
      keepIntermediates: false
    }
  };
}

function createNeutralStarterProject({ name, projectId, language = 'en', templateId = 'bold_kinetic', brandName = 'Your Brand', headline, subheadline, assets = [], brand = {} }) {
  const project = createBlankProject(name, language);
  project.project.id = projectId;
  project.project.clientOrProduct = brandName;
  project.template.id = templateId;
  project.creative = {
    objective: 'awareness',
    audience: '',
    painPoint: '',
    keyMessage: language === 'bn' ? 'আপনার পণ্য বা সেবার সত্য তথ্য যোগ করুন।' : 'Add a clear, evidence-backed message about your product or service.',
    tone: 'minimal',
    benefits: [],
    productTruthProfile: [],
    claimEvidenceNotes: 'Add source material and approve product claims before using them.',
    cta: { label: '', destination: '' }
  };
  project.brand = { ...project.brand, ...brand, name: brandName };
  project.assets = assets;
  project.scenes = [
    {
      id: 'hook', kind: 'kinetic_text', durationSeconds: 5,
      eyebrow: language === 'bn' ? 'আপনার গল্প' : 'YOUR STORY',
      headline, subheadline, highlightWords: [], layout: 'centered',
      motion: { entrance: 'stagger_words', emphasis: 'none', exit: 'fade', transition: 'crossfade', cameraPreset: 'none', intensity: 0.7 }
    },
    {
      id: 'showcase', kind: 'ui_demo', durationSeconds: 5,
      eyebrow: language === 'bn' ? 'পণ্য দেখান' : 'SHOW YOUR PRODUCT',
      headline: language === 'bn' ? 'অনুমোদিত পণ্যের ছবি যোগ করুন' : 'Add an approved product screenshot',
      subheadline: '', mediaAssetIds: [], layout: 'device_mockup', deviceFrame: 'browser_window',
      motion: { entrance: 'fade_up', emphasis: 'none', exit: 'fade', transition: 'wipe_left', cameraPreset: 'slow_pan', intensity: 0.6 }
    },
    {
      id: 'cta', kind: 'cta', durationSeconds: 5,
      headline: language === 'bn' ? 'পরবর্তী পদক্ষেপ যোগ করুন' : 'Add a clear next step',
      subheadline: '', ctaLabel: '', ctaDestination: '', layout: 'centered',
      motion: { entrance: 'scale_pop', emphasis: 'none', exit: 'fade', transition: 'cut', cameraPreset: 'none', intensity: 0.6 }
    }
  ];
  project.audio.mode = 'silent';
  project.audio.muteAll = true;
  project.export.fileStem = projectId;
  return project;
}

export function createEasyModeratorProject() {
  return createNeutralStarterProject({
    name: 'EasyModerator Product Story', projectId: 'easymoderator-story', language: 'mixed',
    templateId: 'guided_product_story', brandName: 'EasyModerator',
    headline: 'Write the EasyModerator story you can verify.',
    subheadline: 'Use your approved product facts and selected screenshots.',
    brand: {
      tagline: 'Manage conversations. Stay in control.',
      primaryColor: '#7460D9', backgroundColor: '#17223B', textColor: '#FFFFFF', accentColor: '#F4C35E',
      latinFontFamily: 'Inter', banglaFontFamily: 'Noto Sans Bengali', fontWeight: 800,
      cornerRadiusPx: 16, stylePreset: 'bold_future', logoPlacement: 'outro', watermark: false
    },
    assets: [
      { id: 'logo', kind: 'logo', file: 'assets/logo.png', usageRights: 'owner' },
      { id: 'inbox', kind: 'image', file: 'assets/inbox-demo.png', usageRights: 'owner', fit: 'contain' },
      { id: 'music', kind: 'music', file: 'assets/background-music.wav', usageRights: 'licensed' }
    ]
  });
}
export function createSaasStarterProject() {
  return createNeutralStarterProject({
    name: 'SaaS Product Story', projectId: 'saas-product-story', templateId: 'bold_kinetic',
    brandName: 'Your SaaS Brand', headline: 'Write your software product’s opening line.',
    subheadline: 'Describe only features and outcomes you can support with evidence.'
  });
}
export function createMobileAppStarterProject() {
  return createNeutralStarterProject({
    name: 'Mobile App Showcase', projectId: 'mobile-app-showcase', templateId: 'app_showcase',
    brandName: 'Your App Brand', headline: 'Write your app’s opening line.',
    subheadline: 'Add real screens and verified product details.'
  });
}
export function createGuidedStoryBanglaProject() {
  const project = createNeutralStarterProject({
    name: 'বাংলা পণ্যের গল্প', projectId: 'bangla-product-story', language: 'bn',
    templateId: 'guided_product_story', brandName: 'আপনার ব্র্যান্ড',
    headline: 'আপনার গল্পের শুরু এখান থেকে।',
    subheadline: 'পণ্য বা সেবার সত্য তথ্য যোগ করুন।'
  });
  project.scenes[1].eyebrow = 'পণ্য দেখান';
  project.scenes[1].headline = 'অনুমোদিত পণ্যের ছবি যোগ করুন';
  project.scenes[2].headline = 'পরবর্তী পদক্ষেপ যোগ করুন';
  return project;
}
export function createAudioClip({
  id = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  kind = 'voice',
  assetId,
  sceneId = null,
  offsetMs = 0,
  trimInMs = 0,
  trimOutMs = null,
  volumeDb = 0,
  fadeInMs = 0,
  fadeOutMs = 0,
  ducking = false,
  loop = false,
  enabled = true
}) {
  return {
    id,
    kind,
    assetId,
    sceneId,
    offsetMs,
    trimInMs,
    trimOutMs,
    volumeDb,
    fadeInMs,
    fadeOutMs,
    ducking,
    loop,
    enabled
  };
}

export function migrateProjectAudio(project) {
  if (!project) return project;
  if (!project.audio) {
    project.audio = {
      mode: 'silent',
      muteAll: false,
      musicVolume: 0.25,
      voiceoverVolume: 1.0,
      fadeInSeconds: 0.4,
      fadeOutSeconds: 0.8,
      duckMusicUnderVoice: true,
      duckingDb: -12,
      targetLufs: -16,
      clips: []
    };
  }

  // Ensure explicit mode is set
  if (!project.audio.mode) {
    if (project.audio.muteAll) {
      project.audio.mode = 'silent';
    } else if (project.audio.voiceoverAssetId && project.audio.musicAssetId) {
      project.audio.mode = 'voice_and_music';
    } else if (project.audio.voiceoverAssetId) {
      project.audio.mode = 'imported_voice';
    } else if (project.audio.musicAssetId) {
      project.audio.mode = 'music_only';
    } else {
      project.audio.mode = 'voice_and_music';
    }
  }

  if (!Array.isArray(project.audio.clips)) {
    project.audio.clips = [];
  }

  if (typeof project.audio.duckMusicUnderVoice !== 'boolean') {
    project.audio.duckMusicUnderVoice = true;
  }
  if (typeof project.audio.duckingDb !== 'number') {
    project.audio.duckingDb = -12;
  }
  if (typeof project.audio.targetLufs !== 'number') {
    project.audio.targetLufs = -16;
  }
  if (!project.audio.narration) {
    project.audio.narration = {
      provider: 'gemini',
      language: project.project?.language === 'bn' ? 'bn' : (project.project?.language === 'mixed' ? 'mixed' : 'en'),
      voice: 'Puck',
      speed: 1.0
    };
  }

  return project;
}

export function createTruthItem({
  id = `claim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  featureOrClaim = '',
  status = 'verified_live',
  evidenceSource = '',
  isApproved = true,
  notes = ''
} = {}) {
  return {
    id,
    featureOrClaim,
    status, // 'verified_live' | 'approved_demo' | 'planned' | 'unknown'
    evidenceSource,
    isApproved,
    notes
  };
}

export function migrateProjectCreative(project) {
  if (!project) return project;
  project.creative = project.creative || {};
  if (!Array.isArray(project.creative.productTruthProfile)) {
    project.creative.productTruthProfile = [];
  }
  if (!Array.isArray(project.creative.concepts)) {
    project.creative.concepts = [];
  }
  if (!Array.isArray(project.creative.benefits)) {
    project.creative.benefits = project.creative.keyMessage ? [project.creative.keyMessage] : [];
  }
  if (!Array.isArray(project.creative.prohibitedTopics)) {
    project.creative.prohibitedTopics = project.creative.prohibitedPhrases || [];
  }
  if (typeof project.creative.spendBudgetUsd !== 'number') {
    project.creative.spendBudgetUsd = 1.00;
  }
  return project;
}


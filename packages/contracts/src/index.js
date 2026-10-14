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

export function createBlankProject(name = 'My Kinetic Promo', language = 'en') {
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
      audience: 'Modern teams & creators',
      keyMessage: 'Fast, bold video generation for your brand',
      tone: 'bold',
      cta: {
        label: 'Get Started Today',
        destination: 'https://example.com'
      }
    },
    brand: {
      name: 'Kinetic Studio',
      tagline: 'High-impact motion made offline.',
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
        eyebrow: 'INTRODUCING',
        headline: 'Create Bold Videos In Seconds',
        subheadline: 'No cloud. No complexity. 100% offline.',
        highlightWords: ['Bold Videos'],
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
        headline: 'Start Creating Now',
        subheadline: 'Kinetic Studio V0.01',
        ctaLabel: 'Try It Free',
        ctaDestination: 'https://easymod.tech',
        layout: 'centered',
        motion: {
          entrance: 'scale_pop',
          exit: 'fade',
          easing: 'ease_out'
        }
      }
    ],
    audio: {
      muteAll: true,
      musicVolume: 0.25,
      fadeInSeconds: 0.5,
      fadeOutSeconds: 0.8
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

export function createEasyModeratorProject() {
  return {
    schemaVersion: '1.0',
    project: {
      id: 'easymoderator-launch',
      name: 'EasyModerator Launch Film',
      campaignName: 'Merchant productivity',
      language: 'mixed',
      clientOrProduct: 'EasyModerator'
    },
    template: {
      id: 'bold_kinetic',
      version: '1.0.0',
      variant: 'bold'
    },
    creative: {
      objective: 'awareness',
      audience: 'Bangladesh Facebook shop owners',
      painPoint: 'Handling many customer messages manually',
      keyMessage: 'Make customer conversations easier to manage',
      tone: 'bold',
      languageStyle: 'mixed',
      platforms: ['facebook_reels', 'youtube', 'website'],
      claimEvidenceNotes: 'Use only verified EasyModerator product features and approved demo screenshots',
      requiredPhrases: ['EasyModerator'],
      prohibitedPhrases: ['Guaranteed more sales', 'Replace all employees'],
      cta: {
        label: 'Explore EasyModerator',
        destination: 'https://easymod.tech'
      }
    },
    brand: {
      name: 'EasyModerator',
      tagline: 'Manage conversations. Stay in control.',
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
    assets: [
      {
        id: 'logo',
        kind: 'logo',
        file: 'assets/logo.png',
        usageRights: 'owner'
      },
      {
        id: 'inbox',
        kind: 'image',
        file: 'assets/inbox-demo.png',
        usageRights: 'owner',
        fit: 'contain'
      }
    ],
    targets: [
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
        eyebrow: 'THE CHALLENGE',
        headline: 'Too many customer messages?',
        subheadline: 'Too little time to reply?',
        highlightWords: ['messages'],
        layout: 'centered',
        motion: {
          entrance: 'stagger_words',
          emphasis: 'highlight',
          exit: 'fade',
          easing: 'spring',
          intensity: 0.72,
          staggerMilliseconds: 70
        },
        afterTransition: 'crossfade',
        transitionDurationSeconds: 0.3
      },
      {
        id: 'problem',
        kind: 'problem',
        durationSeconds: 4,
        headline: 'Running your shop should feel simpler.',
        subheadline: 'Manual replies slow your team down.',
        body: 'Messages, questions, and orders need instant attention.',
        layout: 'centered',
        motion: {
          entrance: 'slide_left',
          exit: 'fade',
          easing: 'ease_out'
        }
      },
      {
        id: 'reveal',
        kind: 'solution',
        durationSeconds: 4,
        eyebrow: 'THE SOLUTION',
        headline: 'Meet EasyModerator',
        subheadline: 'A better way to manage conversations.',
        mediaAssetIds: ['logo'],
        layout: 'centered',
        motion: {
          entrance: 'scale_pop',
          exit: 'fade',
          easing: 'spring'
        }
      },
      {
        id: 'demo',
        kind: 'ui_demo',
        durationSeconds: 5,
        eyebrow: 'SMART INBOX',
        headline: 'Conversations in Action',
        subheadline: 'Real interface. Clear merchant control.',
        mediaAssetIds: ['inbox'],
        layout: 'device_mockup',
        deviceFrame: 'browser_window',
        motion: {
          entrance: 'mask_reveal',
          exit: 'slide_left',
          easing: 'ease_in_out'
        }
      },
      {
        id: 'cta',
        kind: 'cta',
        durationSeconds: 4,
        headline: 'Take control of your conversations.',
        subheadline: 'EasyModerator',
        ctaLabel: 'Explore EasyModerator',
        ctaDestination: 'https://easymod.tech',
        mediaAssetIds: ['logo'],
        layout: 'centered',
        motion: {
          entrance: 'fade_up',
          exit: 'fade',
          easing: 'ease_out'
        }
      }
    ],
    audio: {
      muteAll: true,
      musicVolume: 0.22,
      fadeInSeconds: 0.4,
      fadeOutSeconds: 0.8,
      duckMusicUnderVoice: true,
      beatSync: 'off'
    },
    captions: {
      enabled: false,
      source: 'scene_text',
      position: 'bottom',
      maxWordsPerLine: 5
    },
    export: {
      fileStem: 'easymoderator-launch',
      format: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      qualityPreset: 'high',
      workers: 1,
      useGpuIfAvailable: false,
      overwriteExisting: true,
      includeProjectArchive: false,
      includeThumbnail: true,
      keepIntermediates: false
    }
  };
}

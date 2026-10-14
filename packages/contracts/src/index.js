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

export function createSaasStarterProject() {
  return {
    schemaVersion: '1.0',
    project: {
      id: 'cloudpulse-analytics',
      name: 'CloudPulse Analytics Launch',
      campaignName: 'Product Growth 2026',
      language: 'en',
      clientOrProduct: 'CloudPulse'
    },
    template: {
      id: 'bold_kinetic',
      version: '1.0.0',
      variant: 'default'
    },
    creative: {
      objective: 'product_launch',
      audience: 'Product managers, founders, growth engineers',
      painPoint: 'Fragmented analytics tools and delayed event tracking',
      keyMessage: 'Real-time product metrics and funnel conversion tracking',
      tone: 'bold',
      cta: {
        label: 'Start Free 14-Day Trial',
        destination: 'https://cloudpulse.io'
      }
    },
    brand: {
      name: 'CloudPulse',
      tagline: 'See every user journey in real-time.',
      primaryColor: '#6366F1',
      backgroundColor: '#0F172A',
      textColor: '#FFFFFF',
      accentColor: '#10B981',
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
        eyebrow: 'TIRED OF BLIND SPOTS?',
        headline: 'Know Exactly Why Users Drop Off',
        subheadline: 'Full-stack funnel analytics with sub-second queries.',
        highlightWords: ['Drop Off'],
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
        transitionDurationSeconds: 0.35
      },
      {
        id: 'problem',
        kind: 'problem',
        durationSeconds: 4,
        headline: 'Traditional dashboards lag hours behind your traffic.',
        subheadline: 'Lost conversions are discovered when it is already too late.',
        body: 'CloudPulse streams event telemetry live without sampling.',
        layout: 'centered',
        motion: {
          entrance: 'slide_left',
          exit: 'fade',
          easing: 'ease_out'
        }
      },
      {
        id: 'solution',
        kind: 'solution',
        durationSeconds: 4,
        eyebrow: 'THE MODERN ANALYTICS ENGINE',
        headline: 'Introducing CloudPulse Live Stream',
        subheadline: 'Instant cohorts, retention matrices, and churn predictors.',
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
        eyebrow: 'TELEMETRY WORKSPACE',
        headline: 'One Dashboard for All Metrics',
        subheadline: 'Filter by geography, subscription tier, and device in real time.',
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
        headline: 'Scale Conversions With Confidence',
        subheadline: 'CloudPulse Analytics',
        ctaLabel: 'Start Free Trial',
        ctaDestination: 'https://cloudpulse.io',
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
      musicVolume: 0.25,
      fadeInSeconds: 0.4,
      fadeOutSeconds: 0.8
    },
    captions: {
      enabled: false,
      source: 'scene_text',
      position: 'bottom',
      maxWordsPerLine: 5
    },
    export: {
      fileStem: 'cloudpulse-analytics',
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

export function createMobileAppStarterProject() {
  return {
    schemaVersion: '1.0',
    project: {
      id: 'flowpay-wallet',
      name: 'FlowPay Borderless Wallet',
      campaignName: 'App Store Global Launch',
      language: 'en',
      clientOrProduct: 'FlowPay'
    },
    template: {
      id: 'app_showcase',
      version: '1.0.0',
      variant: 'default'
    },
    creative: {
      objective: 'product_launch',
      audience: 'Global travelers, freelancers, remote workers',
      painPoint: 'High currency exchange fees and slow wire transfers',
      keyMessage: 'Send money instantly across 160+ countries with zero hidden fees',
      tone: 'bold',
      cta: {
        label: 'Download On App Store',
        destination: 'https://flowpay.app'
      }
    },
    brand: {
      name: 'FlowPay',
      tagline: 'Borderless money for the modern world.',
      primaryColor: '#0284C7',
      backgroundColor: '#0A0F1D',
      textColor: '#FFFFFF',
      accentColor: '#38BDF8',
      latinFontFamily: 'Inter',
      banglaFontFamily: 'Noto Sans Bengali',
      fontWeight: 800,
      cornerRadiusPx: 20,
      stylePreset: 'clean_minimal',
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
        eyebrow: 'GLOBAL MONEY TRANSFER',
        headline: 'Send Money Anywhere In Seconds',
        subheadline: 'Zero bank markups. Real mid-market exchange rates.',
        highlightWords: ['Anywhere'],
        layout: 'centered',
        motion: {
          entrance: 'stagger_words',
          emphasis: 'highlight',
          exit: 'fade',
          easing: 'spring',
          intensity: 0.8,
          staggerMilliseconds: 65
        },
        afterTransition: 'crossfade',
        transitionDurationSeconds: 0.35
      },
      {
        id: 'app_demo',
        kind: 'ui_demo',
        durationSeconds: 5,
        eyebrow: 'ONE-TAP PAYMENTS',
        headline: 'Tap, Confirm, Transferred',
        subheadline: 'Biometric security and instant recipient push notifications.',
        highlightWords: ['Transferred'],
        layout: 'device_mockup',
        deviceFrame: 'mobile',
        callouts: [
          { label: 'Instant Settlement', x: 0.65, y: 0.4, placement: 'left' }
        ],
        motion: {
          entrance: 'scale_pop',
          exit: 'slide_left',
          easing: 'spring'
        }
      },
      {
        id: 'stat',
        kind: 'stat',
        durationSeconds: 4,
        statValue: '0.0%',
        statLabel: 'Hidden FX markups across 45 currencies',
        headline: 'Transparent Global Banking',
        subheadline: 'Keep more of your hard-earned money on every international transfer.',
        highlightWords: ['Transparent'],
        layout: 'centered',
        motion: {
          entrance: 'scale_pop',
          exit: 'fade',
          easing: 'spring'
        }
      },
      {
        id: 'cta',
        kind: 'cta',
        durationSeconds: 4,
        headline: 'Experience Borderless Freedom',
        subheadline: 'FlowPay Digital Wallet',
        ctaLabel: 'Download Free App',
        ctaDestination: 'https://flowpay.app',
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
      musicVolume: 0.25,
      fadeInSeconds: 0.4,
      fadeOutSeconds: 0.8
    },
    captions: {
      enabled: false,
      source: 'scene_text',
      position: 'bottom',
      maxWordsPerLine: 5
    },
    export: {
      fileStem: 'flowpay-wallet',
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

export function createGuidedStoryBanglaProject() {
  return {
    schemaVersion: '1.0',
    project: {
      id: 'dukanbot-story',
      name: 'দোকানবট — মার্চেন্ট প্রমোশনাল স্টোরি',
      campaignName: 'Merchant Freedom 2026',
      language: 'bn',
      clientOrProduct: 'দোকানবট'
    },
    template: {
      id: 'guided_product_story',
      version: '1.0.0',
      variant: 'editorial_lime'
    },
    creative: {
      objective: 'awareness',
      audience: 'অনলাইন উদ্যোক্তা, ফেসবুক পেজ ও এফ-কমার্স বিক্রেতা',
      painPoint: 'হাজারো মেসেজের উত্তর দিতে না পেরে কাস্টমার হারানো',
      keyMessage: 'স্বয়ংক্রিয় মেসেজিং ও অর্ডারের মাধ্যমে বিক্রি বাড়ান বহুগুণ',
      tone: 'bold',
      languageStyle: 'bangla',
      cta: {
        label: 'ফ্রি ট্রায়াল শুরু করুন',
        destination: 'https://dukanbot.local'
      }
    },
    brand: {
      name: 'দোকানবট',
      tagline: 'গ্রাহকের সাথে কথা হবে নিমেষেই।',
      primaryColor: '#18181B',
      backgroundColor: '#F9F9F6',
      textColor: '#18181B',
      accentColor: '#CCFF00',
      latinFontFamily: 'Inter',
      banglaFontFamily: 'Nirmala UI, Noto Sans Bengali, sans-serif',
      fontWeight: 800,
      cornerRadiusPx: 16,
      stylePreset: 'clean_minimal',
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
        chapterNumber: 1,
        chapterTitle: 'সমস্যা ও সমাধান',
        kind: 'kinetic_text',
        durationSeconds: 6,
        eyebrow: 'গ্রাহক সেবা ও ব্যবসা',
        headline: 'হাজারো কাস্টমার মেসেজ সামলাতে হিমশিম খাচ্ছেন?',
        subheadline: 'প্রতিটি মেসেজের উত্তর দেওয়া এখন আরও সহজ ও দ্রুত।',
        highlightWords: ['হিমশিম'],
        layout: 'centered',
        motion: {
          entrance: 'stagger_words',
          emphasis: 'highlight',
          exit: 'fade',
          easing: 'spring',
          intensity: 0.85,
          staggerMilliseconds: 80
        },
        afterTransition: 'crossfade',
        transitionDurationSeconds: 0.35
      },
      {
        id: 'pain',
        chapterNumber: 1,
        chapterTitle: 'সমস্যা ও সমাধান',
        kind: 'problem',
        durationSeconds: 5,
        headline: 'দেরিতে রিপ্লাই মানেই নিশ্চিত কাস্টমার হারানো।',
        subheadline: 'ম্যানুয়াল রিপ্লাই দিয়ে ব্যস্ত ব্যবসা পরিচালনা অসম্ভব।',
        body: 'ইনবক্সে জমে থাকা শত শত প্রশ্নের উত্তর সময়মতো না দিলে বিক্রি হাতছাড়া হয়।',
        highlightWords: ['কাস্টমার হারানো'],
        layout: 'centered',
        motion: {
          entrance: 'slide_left',
          exit: 'fade',
          easing: 'ease_out'
        }
      },
      {
        id: 'reveal',
        chapterNumber: 2,
        chapterTitle: 'স্মার্ট সমাধান',
        kind: 'solution',
        durationSeconds: 6,
        eyebrow: 'উপস্থাপন করছি আধুনিক প্রযুক্তি',
        headline: 'দোকানবট — আপনার ব্যবসার ডিজিটাল সেলস পার্টনার',
        subheadline: '২৪ ঘণ্টা নিরবচ্ছিন্ন কাস্টমার সার্ভিস ও সেলস অটোমেশন।',
        highlightWords: ['ডিজিটাল সেলস'],
        layout: 'centered',
        motion: {
          entrance: 'scale_pop',
          exit: 'fade',
          easing: 'spring'
        }
      },
      {
        id: 'phone_demo',
        chapterNumber: 3,
        chapterTitle: 'মোবাইল চ্যাট ডেমো',
        kind: 'ui_demo',
        durationSeconds: 7,
        eyebrow: 'তাত্ক্ষণিক মোবাইল চ্যাট',
        headline: 'মেসেঞ্জারে স্বয়ংক্রিয় প্রডাক্ট ক্যাটালগ ও অর্ডার',
        subheadline: 'কাস্টমার ছবি দেখে সরাসরি কার্ট ও অর্ডারে যুক্ত হতে পারে।',
        highlightWords: ['স্বয়ংক্রিয়'],
        layout: 'device_mockup',
        deviceFrame: 'mobile',
        callouts: [
          { label: '১ সেকেন্ডে রিপ্লাই', x: 0.7, y: 0.35, placement: 'left' }
        ],
        motion: {
          entrance: 'mask_reveal',
          exit: 'slide_left',
          easing: 'ease_in_out'
        }
      },
      {
        id: 'dashboard_demo',
        chapterNumber: 4,
        chapterTitle: 'ড্যাশবোর্ড ও রিপোর্ট',
        kind: 'ui_demo',
        durationSeconds: 7,
        eyebrow: 'সেন্ট্রাল মার্চেন্ট হাব',
        headline: 'একটি ড্যাশবোর্ডে সব অর্ডার ও কাস্টমার ডেটা',
        subheadline: 'ডেলিভারি ট্র্যাকিং ও ইনভেন্টরি ম্যানেজমেন্ট এক জায়গায়।',
        highlightWords: ['ড্যাশবোর্ড'],
        layout: 'device_mockup',
        deviceFrame: 'browser_window',
        callouts: [
          { label: 'লাইভ অর্ডার স্ট্যাটাস', x: 0.65, y: 0.5, placement: 'top' }
        ],
        motion: {
          entrance: 'slide_right',
          exit: 'fade',
          easing: 'spring'
        }
      },
      {
        id: 'stat_beat',
        chapterNumber: 5,
        chapterTitle: 'ফলাফল ও প্রবৃদ্ধি',
        kind: 'stat',
        durationSeconds: 5,
        statValue: '১০ গুণ',
        statLabel: 'দ্রুত কাস্টমার রেসপন্স ও বিক্রির গতি',
        headline: 'বিক্রি বাড়বে ১০ গুণ পর্যন্ত দ্রুত',
        subheadline: 'কর্মীদের সময় বাঁচবে, বাড়বে গ্রাহকের সন্তুষ্টি।',
        highlightWords: ['১০ গুণ'],
        layout: 'centered',
        motion: {
          entrance: 'scale_pop',
          exit: 'fade',
          easing: 'spring'
        }
      },
      {
        id: 'trust',
        chapterNumber: 6,
        chapterTitle: 'নিরাপত্তা ও সহজ সেটআপ',
        kind: 'feature',
        durationSeconds: 5,
        eyebrow: 'কোনো কোডিং প্রয়োজন নেই',
        headline: '৫ মিনিটেই ফেসবুক পেজ কানেক্ট করুন',
        subheadline: 'সহজ বাংলা ইন্টারফেস ও সার্বক্ষণিক কাস্টমার সাপোর্ট।',
        highlightWords: ['৫ মিনিটেই'],
        layout: 'centered',
        motion: {
          entrance: 'fade_up',
          exit: 'fade',
          easing: 'ease_out'
        }
      },
      {
        id: 'cta',
        chapterNumber: 7,
        chapterTitle: 'শুরু করুন আজই',
        kind: 'cta',
        durationSeconds: 6,
        headline: 'আজই শুরু করুন আপনার সফল ব্যবসার যাত্রা',
        subheadline: 'দোকানবট — আধুনিক উদ্যোক্তার বিশ্বস্ত সহযোগী।',
        ctaLabel: 'ফ্রি ট্রায়াল শুরু করুন',
        ctaDestination: 'https://dukanbot.local',
        highlightWords: ['দোকানবট'],
        layout: 'centered',
        motion: {
          entrance: 'scale_pop',
          exit: 'fade',
          easing: 'spring'
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
      fileStem: 'dukanbot-story',
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

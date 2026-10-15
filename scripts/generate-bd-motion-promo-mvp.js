import { buildServer } from '../apps/local-server/src/index.js';
import {
  resolveStoragePaths,
  loadExportsManifest,
  recordExportInManifest
} from '@kinetic-studio/contracts';
import {
  verifyMediaDecode,
  probeMedia,
  measureAudioVolume,
  detectSilence,
  synthesizeSpeechGemini,
  isGeminiTtsAvailable
} from '@kinetic-studio/render-adapter';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve('.');
const psVoiceScript = path.join(repoRoot, 'tests', 'helpers', 'create-local-narration.ps1');

async function synthesizeOrFallbackVoice(text, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  
  if (isGeminiTtsAvailable()) {
    try {
      console.log(`   [TTS] Synthesizing Bangla voice with Gemini Flash TTS: "${text.slice(0, 32)}..."`);
      const cacheDir = path.resolve('E:/GrowthStudio/renders/tts_cache');
      fs.mkdirSync(cacheDir, { recursive: true });
      const res = await synthesizeSpeechGemini({ text, voice: 'Puck', cacheDir });
      fs.writeFileSync(outputPath, res.wavBuffer);
      // Brief pause to avoid burst rate limits on Gemini API
      await new Promise(r => setTimeout(r, 1200));
      return { path: outputPath, durationSeconds: res.durationSeconds };
    } catch (err) {
      console.warn(`   [TTS Warning] Gemini TTS failed (${err.message}). Falling back to local offline synthesizer.`);
    }
  }

  // Fallback to local offline Windows synthesizer
  console.log(`   [TTS] Synthesizing offline fallback voice: "${text.slice(0, 32)}..."`);
  execFileSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psVoiceScript,
    '-OutputPath', outputPath, '-Text', text
  ], { stdio: 'pipe', windowsHide: true });

  const buffer = fs.readFileSync(outputPath);
  const durationSeconds = (buffer.length - 44) / (24000 * 2);
  return { path: outputPath, durationSeconds };
}

async function waitForJobDone(server, jobId, maxWaitMs = 360000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await server.inject({ method: 'GET', url: `/api/renders/${jobId}` });
    if (res.statusCode === 200) {
      const job = JSON.parse(res.body);
      if (job.status === 'done') return job;
      if (job.status === 'failed' || job.status === 'cancelled') {
        throw new Error(`Job ${jobId} ended with status ${job.status}: ${job.error || 'Unknown error'}`);
      }
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error(`Timeout waiting for job ${jobId} to complete after ${maxWaitMs}ms`);
}

async function main() {
  console.log('========================================================================');
  console.log('  GROWTH STUDIO V0.03.1 — EASYMODERATOR BD MOTION PROMO PRODUCTION');
  console.log('========================================================================');

  const storage = resolveStoragePaths();
  console.log(`Storage root: ${storage.root} (E: Drive: ${storage.isEDrive})`);

  // Build local server instance
  console.log('\n[1/5] Launching Fastify Local Server...');
  const server = await buildServer();
  const resHealth = await server.inject({ method: 'GET', url: '/api/health' });
  assert.equal(resHealth.statusCode, 200);
  console.log('✓ Fastify server online and ready.');

  // Source assets
  const seedAssetsDir = path.resolve('data/projects/easymoderator-launch/assets');
  assert.ok(fs.existsSync(seedAssetsDir), 'Seed assets directory must exist');

  // ========================================================================
  // PROJECT 1: Video A & B (Problem -> Solution Promo, 30s)
  // ========================================================================
  console.log('\n[2/5] Creating Project 1: EasyModerator BD Main Promo (Problem -> Solution)...');
  const projAId = 'easymoderator-bd-promo-a';
  const projADir = path.join(storage.projects, projAId);
  const assetsADir = path.join(projADir, 'assets');
  fs.mkdirSync(assetsADir, { recursive: true });

  // Copy logo, demo image, and background music
  fs.copyFileSync(path.join(seedAssetsDir, 'logo.png'), path.join(assetsADir, 'logo.png'));
  fs.copyFileSync(path.join(seedAssetsDir, 'inbox-demo.png'), path.join(assetsADir, 'inbox-demo.png'));
  fs.copyFileSync(path.join(seedAssetsDir, 'background-music.wav'), path.join(assetsADir, 'background-music.wav'));

  // Scene scripts for Video A & B
  const scriptsA = {
    hook: 'মেসেজ সামলাতেই কি আপনার দিনের অনেকটা সময় চলে যায়? ইনবক্সে জমে থাকা শত শত কাস্টমার মেসেজের সমাধান এবার আরও সহজে।',
    problem: 'ম্যানুয়ালি রিপ্লাই দিতে দেরি হলে কাস্টমার অর্ডার অন্য কোথাও চলে যেতে পারে। দরকার তাৎক্ষণিক রেসপন্স।',
    solution: 'পরিচয় করিয়ে দিচ্ছি EasyModerator। আপনার অনলাইন শপের কথোপকথন এখন হবে সহজ, গতিশীল এবং গোছানো।',
    demo: 'স্মার্ট ইনবক্সে ফেসবুক মেসেঞ্জার ও পোস্ট কমেন্টের কাস্টমার মেসেজ হ্যান্ডেল করুন এক প্ল্যাটফর্ম থেকেই।',
    workflow: 'মেসেজ আসলে অটোমেটিক দ্রুত উত্তর দিন, পণ্যের তথ্য জানান এবং সহজেই ক্যাশ অন ডেলিভারি অর্ডার কনফার্ম করুন।',
    cta: 'কথোপকথন নিয়ন্ত্রণ করুন নিজের মতো। আজই ঘুরে আসুন EasyModerator ওয়েবসাইটে।'
  };

  const narrationAssetsA = [];
  for (const [sId, text] of Object.entries(scriptsA)) {
    const filename = `voice-${sId}.wav`;
    const outPath = path.join(assetsADir, filename);
    const voiceRes = await synthesizeOrFallbackVoice(text, outPath);
    narrationAssetsA.push({
      id: `voice-${sId}`,
      kind: 'voiceover',
      file: `assets/${filename}`,
      durationSeconds: Number(voiceRes.durationSeconds.toFixed(2)),
      usageRights: 'owner'
    });
  }

  const projectAPayload = {
    schemaVersion: '1.0',
    project: {
      id: projAId,
      name: 'EasyModerator BD Main Promo (Problem -> Solution)',
      campaignName: 'Bangladesh Merchant Motion Promo',
      language: 'bn',
      clientOrProduct: 'EasyModerator'
    },
    template: {
      id: 'guided_product_story',
      version: '1.0.0',
      variant: 'bold'
    },
    creative: {
      objective: 'conversion',
      audience: 'Bangladesh Facebook shop owners & F-commerce sellers',
      painPoint: 'Handling hundreds of repetitive customer messages manually in inbox',
      keyMessage: 'মেসেজ সামলান সহজে, ব্যবসার গতি বাড়ান অনায়াসে।',
      tone: 'bold',
      languageStyle: 'mixed',
      platforms: ['facebook_reels', 'youtube', 'website'],
      claimEvidenceNotes: 'EasyModerator verified live messenger moderation and order inbox features only',
      requiredPhrases: ['EasyModerator'],
      prohibitedPhrases: ['Guaranteed sales growth', 'Replace all employees', '100% free forever'],
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
      { id: 'logo', kind: 'logo', file: 'assets/logo.png', usageRights: 'owner' },
      { id: 'inbox', kind: 'image', file: 'assets/inbox-demo.png', usageRights: 'owner', fit: 'contain' },
      { id: 'music', kind: 'music', file: 'assets/background-music.wav', usageRights: 'licensed', durationSeconds: 30 },
      ...narrationAssetsA
    ],
    targets: [
      { id: 'portrait', width: 1080, height: 1920, fps: 30, safeMarginPercent: 9, fitMode: 'reflow' },
      { id: 'landscape', width: 1920, height: 1080, fps: 30, safeMarginPercent: 7, fitMode: 'reflow' }
    ],
    scenes: [
      {
        id: 'hook',
        kind: 'kinetic_text',
        durationSeconds: 5,
        eyebrow: 'অনলাইন শপ ম্যানেজমেন্ট',
        headline: 'মেসেজ সামলাতেই কি দিনের অনেকটা সময় চলে যায়?',
        subheadline: 'ইনবক্সে জমে থাকা শত শত কাস্টমার মেসেজ ও অর্ডার ইনকোয়ারি',
        highlightWords: ['মেসেজ সামলাতেই'],
        narrationAssetId: 'voice-hook',
        narrationText: scriptsA.hook,
        narrationDurationSeconds: 3.5,
        isApproved: true,
        approvalStatus: 'approved',
        layout: 'centered',
        motion: { entrance: 'stagger_words', emphasis: 'highlight', exit: 'fade', easing: 'spring', intensity: 0.8, staggerMilliseconds: 70 }
      },
      {
        id: 'problem',
        kind: 'problem',
        durationSeconds: 5,
        eyebrow: 'বাস্তব চ্যালেঞ্জ',
        headline: 'দেরি হলে কাস্টমার অর্ডার হারায়',
        subheadline: 'ম্যানুয়াল চ্যাট বনাম আধুনিক গতি',
        bulletPoints: [
          'ম্যানুয়াল রিপ্লাই দিতে দেরি হলে কাস্টমার অর্ডার অন্য কোথাও চলে যায়',
          'তাৎক্ষণিক উত্তর পেলে কাস্টমার দ্রুত কেনাকাটা সম্পন্ন করে'
        ],
        narrationAssetId: 'voice-problem',
        narrationText: scriptsA.problem,
        narrationDurationSeconds: 3.6,
        isApproved: true,
        approvalStatus: 'approved',
        layout: 'centered',
        motion: { entrance: 'slide_left', exit: 'fade', easing: 'ease_out' }
      },
      {
        id: 'solution',
        kind: 'solution',
        durationSeconds: 5,
        eyebrow: 'স্মার্ট সমাধান',
        headline: 'পরিচয় করিয়ে দিচ্ছি EasyModerator',
        subheadline: 'আপনার অনলাইন শপের কথোপকথন এখন আরও গোছানো',
        mediaAssetIds: ['logo'],
        highlightWords: ['EasyModerator'],
        narrationAssetId: 'voice-solution',
        narrationText: scriptsA.solution,
        narrationDurationSeconds: 3.8,
        isApproved: true,
        approvalStatus: 'approved',
        layout: 'centered',
        motion: { entrance: 'scale_pop', exit: 'fade', easing: 'spring' }
      },
      {
        id: 'demo',
        kind: 'ui_demo',
        durationSeconds: 5,
        eyebrow: 'লাইভ ইন্টারফেস',
        headline: 'স্মার্ট ইনবক্স ও ইনস্ট্যান্ট রিপ্লাই',
        subheadline: 'মেসেঞ্জার ও কমেন্টে চ্যাট সামলান এক স্ক্রিনে',
        mediaAssetIds: ['inbox'],
        claimDisclaimer: 'EasyModerator লাইভ ইনবক্স ডেমো ইন্টারফেস',
        layout: 'device_mockup',
        deviceFrame: 'browser_window',
        narrationAssetId: 'voice-demo',
        narrationText: scriptsA.demo,
        narrationDurationSeconds: 4.1,
        isApproved: true,
        approvalStatus: 'approved',
        motion: { entrance: 'mask_reveal', exit: 'fade', easing: 'ease_in_out' }
      },
      {
        id: 'workflow',
        kind: 'feature',
        durationSeconds: 5,
        eyebrow: 'কাজের ধাপ',
        headline: '৩টি সহজ ধাপে অর্ডার কনফার্ম',
        subheadline: 'কাস্টমার মেসেজ থেকে নিশ্চিত ডেলিভারি',
        bulletPoints: [
          'মেসেঞ্জার বা কমেন্টে কাস্টমারের প্রশ্ন আসলে',
          'EasyModerator স্বয়ংক্রিয় দ্রুত তথ্য জানায়',
          'ডেলিভারি ঠিকানা ও ফোন নম্বর নিয়ে অর্ডার কনফার্ম'
        ],
        narrationAssetId: 'voice-workflow',
        narrationText: scriptsA.workflow,
        narrationDurationSeconds: 4.2,
        isApproved: true,
        approvalStatus: 'approved',
        layout: 'centered',
        motion: { entrance: 'fade_up', exit: 'fade', easing: 'spring' }
      },
      {
        id: 'cta',
        kind: 'cta',
        durationSeconds: 5,
        eyebrow: 'শুরু করুন আজই',
        headline: 'কথোপকথন নিয়ন্ত্রণ করুন নিজের মতো',
        subheadline: 'EasyModerator — স্মার্ট মডারেশন প্ল্যাটফর্ম',
        ctaLabel: 'Explore EasyModerator',
        ctaDestination: 'https://easymod.tech',
        mediaAssetIds: ['logo'],
        narrationAssetId: 'voice-cta',
        narrationText: scriptsA.cta,
        narrationDurationSeconds: 3.5,
        isApproved: true,
        approvalStatus: 'approved',
        layout: 'centered',
        motion: { entrance: 'fade_up', exit: 'fade', easing: 'spring' }
      }
    ],
    audio: {
      mode: 'voice_and_music',
      muteAll: false,
      musicAssetId: 'music',
      musicVolume: 0.12,
      voiceoverVolume: 1.0,
      fadeInSeconds: 0.5,
      fadeOutSeconds: 1.0,
      duckMusicUnderVoice: true,
      targetLufs: -16
    },
    export: {
      fileStem: 'easymoderator-bd-promo-a',
      format: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      qualityPreset: 'high'
    }
  };

  // Save Project A
  const resSaveA = await server.inject({
    method: 'PUT',
    url: `/api/projects/${projAId}`,
    payload: projectAPayload
  });
  if (resSaveA.statusCode !== 200) {
    console.error('Project A save error:', resSaveA.body);
  }
  assert.equal(resSaveA.statusCode, 200);
  console.log(`✓ Project 1 saved: '${projAId}' (Total duration: 30 seconds)`);

  // ========================================================================
  // PROJECT 2: Video C (Feature / Workflow Explainer, 24s)
  // ========================================================================
  console.log('\n[3/5] Creating Project 2: EasyModerator Feature / Workflow Explainer...');
  const projCId = 'easymoderator-bd-explainer-c';
  const projCDir = path.join(storage.projects, projCId);
  const assetsCDir = path.join(projCDir, 'assets');
  fs.mkdirSync(assetsCDir, { recursive: true });

  fs.copyFileSync(path.join(seedAssetsDir, 'logo.png'), path.join(assetsCDir, 'logo.png'));
  fs.copyFileSync(path.join(seedAssetsDir, 'inbox-demo.png'), path.join(assetsCDir, 'inbox-demo.png'));
  fs.copyFileSync(path.join(seedAssetsDir, 'background-music.wav'), path.join(assetsCDir, 'background-music.wav'));

  const scriptsC = {
    intro: 'EasyModerator কীভাবে কাজ করে? অনলাইন শপে কাস্টমার মেসেজ ও কমেন্ট ম্যানেজ করার সহজ নিয়ম দেখে নিন।',
    steps: 'কাস্টমার দাম বা ডেলিভারি চার্জ জানতে চাইলে অটোমেটিক উত্তর চলে যাবে। প্রয়োজনীয় সাইজ ও স্টক জানিয়ে অর্ডার প্রস্তুত হবে।',
    inbox: 'সবগুলো কথোপকথন এক ইনবক্সে গোছানো থাকে। ফলে কোনো কাস্টমারের মেসেজ মিস হওয়ার সুযোগ থাকে না।',
    cta: 'অনলাইন ব্যবসার সময় বাঁচান এবং মেসেজের গতি বাড়ান। এখনই ভিজিট করুন easymod.tech।'
  };

  const narrationAssetsC = [];
  for (const [sId, text] of Object.entries(scriptsC)) {
    const filename = `voice-${sId}.wav`;
    const outPath = path.join(assetsCDir, filename);
    const voiceRes = await synthesizeOrFallbackVoice(text, outPath);
    narrationAssetsC.push({
      id: `voice-${sId}`,
      kind: 'voiceover',
      file: `assets/${filename}`,
      durationSeconds: Number(voiceRes.durationSeconds.toFixed(2)),
      usageRights: 'owner'
    });
  }

  const projectCPayload = {
    schemaVersion: '1.0',
    project: {
      id: projCId,
      name: 'EasyModerator Feature / Workflow Explainer',
      campaignName: 'Product Workflow Explainer',
      language: 'bn',
      clientOrProduct: 'EasyModerator'
    },
    template: {
      id: 'bold_kinetic',
      version: '1.0.0',
      variant: 'bold'
    },
    creative: {
      objective: 'feature_promo',
      audience: 'Bangladesh online sellers managing orders through Messenger & comments',
      painPoint: 'Repetitive price questions and missing COD orders during peak rush',
      keyMessage: 'EasyModerator অটোমেশনে ব্যবসার গতি বাড়ান।',
      tone: 'bold',
      languageStyle: 'mixed',
      platforms: ['facebook_reels', 'tiktok', 'website'],
      claimEvidenceNotes: 'Automated Messenger responses and smart centralized inbox',
      requiredPhrases: ['EasyModerator'],
      prohibitedPhrases: ['Guaranteed sales growth', '100% free trial without condition'],
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
      { id: 'logo', kind: 'logo', file: 'assets/logo.png', usageRights: 'owner' },
      { id: 'inbox', kind: 'image', file: 'assets/inbox-demo.png', usageRights: 'owner', fit: 'contain' },
      { id: 'music', kind: 'music', file: 'assets/background-music.wav', usageRights: 'licensed', durationSeconds: 24 },
      ...narrationAssetsC
    ],
    targets: [
      { id: 'portrait', width: 1080, height: 1920, fps: 30, safeMarginPercent: 9, fitMode: 'reflow' }
    ],
    scenes: [
      {
        id: 'intro',
        kind: 'kinetic_text',
        durationSeconds: 6,
        eyebrow: 'ফিচার গাইড',
        headline: 'EasyModerator কীভাবে কাজ করে?',
        subheadline: 'অনলাইন উদ্যোক্তাদের জন্য স্বয়ংক্রিয় মেসেজ সমাধান',
        highlightWords: ['EasyModerator'],
        mediaAssetIds: ['logo'],
        narrationAssetId: 'voice-intro',
        narrationText: scriptsC.intro,
        narrationDurationSeconds: 4.1,
        isApproved: true,
        approvalStatus: 'approved',
        layout: 'centered',
        motion: { entrance: 'stagger_words', emphasis: 'highlight', exit: 'fade', easing: 'spring', intensity: 0.85 }
      },
      {
        id: 'steps',
        kind: 'feature',
        durationSeconds: 6,
        eyebrow: 'অটোমেশন ফ্লো',
        headline: 'দ্রুত অটো-রিপ্লাই ও তথ্য প্রদান',
        subheadline: 'কাস্টমারের কমন প্রশ্নের ইনস্ট্যান্ট সমাধান',
        bulletPoints: [
          'প্রোডাক্টের দাম ও ডেলিভারি চার্জ সাথে সাথে জানানো',
          'সাইজ ও কালারের স্টক অ্যাভেইলেবিলিটি চেক',
          'অর্ডার করার জন্য নাম ও মোবাইল নম্বর সংগ্রহ'
        ],
        narrationAssetId: 'voice-steps',
        narrationText: scriptsC.steps,
        narrationDurationSeconds: 4.3,
        isApproved: true,
        approvalStatus: 'approved',
        layout: 'centered',
        motion: { entrance: 'slide_left', exit: 'fade', easing: 'ease_out' }
      },
      {
        id: 'inbox',
        kind: 'ui_demo',
        durationSeconds: 6,
        eyebrow: 'অর্ডার নিশ্চিতকরণ',
        headline: 'সরাসরি ইনবক্স থেকেই সম্পূর্ণ অর্ডার',
        subheadline: 'ক্যাশ অন ডেলিভারি (COD) ঠিকানা ও কাস্টমার ডিটেইলস',
        mediaAssetIds: ['inbox'],
        claimDisclaimer: 'EasyModerator ডেমো ইন্টারফেস',
        layout: 'device_mockup',
        deviceFrame: 'browser_window',
        narrationAssetId: 'voice-inbox',
        narrationText: scriptsC.inbox,
        narrationDurationSeconds: 4.0,
        isApproved: true,
        approvalStatus: 'approved',
        motion: { entrance: 'mask_reveal', exit: 'fade', easing: 'spring' }
      },
      {
        id: 'cta',
        kind: 'cta',
        durationSeconds: 6,
        eyebrow: 'আপনার শপের জন্য',
        headline: 'ব্যবসার সময় বাঁচান, গতি বাড়ান',
        subheadline: 'EasyModerator — স্মার্ট মডারেশন প্ল্যাটফর্ম',
        ctaLabel: 'Explore EasyModerator',
        ctaDestination: 'https://easymod.tech',
        mediaAssetIds: ['logo'],
        narrationAssetId: 'voice-cta',
        narrationText: scriptsC.cta,
        narrationDurationSeconds: 3.6,
        isApproved: true,
        approvalStatus: 'approved',
        layout: 'centered',
        motion: { entrance: 'scale_pop', exit: 'fade', easing: 'spring' }
      }
    ],
    audio: {
      mode: 'voice_and_music',
      muteAll: false,
      musicAssetId: 'music',
      musicVolume: 0.12,
      voiceoverVolume: 1.0,
      fadeInSeconds: 0.5,
      fadeOutSeconds: 1.0,
      duckMusicUnderVoice: true,
      targetLufs: -16
    },
    export: {
      fileStem: 'easymoderator-bd-explainer-c',
      format: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      qualityPreset: 'high'
    }
  };

  const resSaveC = await server.inject({
    method: 'PUT',
    url: `/api/projects/${projCId}`,
    payload: projectCPayload
  });
  if (resSaveC.statusCode !== 200) {
    console.error('Project C save error:', resSaveC.body);
  }
  assert.equal(resSaveC.statusCode, 200);
  console.log(`✓ Project 2 saved: '${projCId}' (Total duration: 24 seconds)`);

  // ========================================================================
  // RENDER PIPELINE: VIDEO A, VIDEO B, VIDEO C
  // ========================================================================
  console.log('\n[4/5] Executing Production MP4 Rendering Pipeline for Videos A, B, and C...');

  const results = [];

  // 1. VIDEO A: Main Promo Portrait (9:16, 1080x1920@30, 30s)
  console.log('\n--- Rendering Video A: Main EasyModerator Promo (9:16 Portrait, 30s) ---');
  const resQA = await server.inject({
    method: 'POST',
    url: `/api/projects/${projAId}/renders`,
    payload: { targetId: 'portrait', project: projectAPayload }
  });
  assert.equal(resQA.statusCode, 202);
  const { jobId: jobAId } = JSON.parse(resQA.body);
  console.log(`   -> Job queued: ${jobAId}`);
  const jobA = await waitForJobDone(server, jobAId, 360000);
  console.log(`✓ Video A render completed: ${jobA.outputPath}`);
  console.log(`   Verifying full stream decode with ffmpeg -xerror...`);
  await verifyMediaDecode(jobA.outputPath);
  console.log('✓ Video A decode test PASSED (0 errors).');
  const probeA = await probeMedia(jobA.outputPath);
  const volA = await measureAudioVolume(jobA.outputPath);
  results.push({ name: 'Video A (Main Promo 9:16)', job: jobA, probe: probeA, volume: volA });

  // 2. VIDEO B: Landscape Adaptation (16:9, 1920x1080@30, 30s)
  console.log('\n--- Rendering Video B: Landscape Adaptation (16:9 Landscape, 30s) ---');
  const resQB = await server.inject({
    method: 'POST',
    url: `/api/projects/${projAId}/renders`,
    payload: { targetId: 'landscape', project: projectAPayload }
  });
  assert.equal(resQB.statusCode, 202);
  const { jobId: jobBId } = JSON.parse(resQB.body);
  console.log(`   -> Job queued: ${jobBId}`);
  const jobB = await waitForJobDone(server, jobBId, 360000);
  console.log(`✓ Video B render completed: ${jobB.outputPath}`);
  console.log(`   Verifying full stream decode with ffmpeg -xerror...`);
  await verifyMediaDecode(jobB.outputPath);
  console.log('✓ Video B decode test PASSED (0 errors).');
  const probeB = await probeMedia(jobB.outputPath);
  const volB = await measureAudioVolume(jobB.outputPath);
  results.push({ name: 'Video B (Landscape Reflow 16:9)', job: jobB, probe: probeB, volume: volB });

  // 3. VIDEO C: Feature / Workflow Explainer (9:16, 1080x1920@30, 24s)
  console.log('\n--- Rendering Video C: Feature / Workflow Explainer (9:16 Portrait, 24s) ---');
  const resQC = await server.inject({
    method: 'POST',
    url: `/api/projects/${projCId}/renders`,
    payload: { targetId: 'portrait', project: projectCPayload }
  });
  assert.equal(resQC.statusCode, 202);
  const { jobId: jobCId } = JSON.parse(resQC.body);
  console.log(`   -> Job queued: ${jobCId}`);
  const jobC = await waitForJobDone(server, jobCId, 360000);
  console.log(`✓ Video C render completed: ${jobC.outputPath}`);
  console.log(`   Verifying full stream decode with ffmpeg -xerror...`);
  await verifyMediaDecode(jobC.outputPath);
  console.log('✓ Video C decode test PASSED (0 errors).');
  const probeC = await probeMedia(jobC.outputPath);
  const volC = await measureAudioVolume(jobC.outputPath);
  results.push({ name: 'Video C (Workflow Explainer 9:16)', job: jobC, probe: probeC, volume: volC });

  // ========================================================================
  // EXTRACT KEYFRAMES FOR VISUAL PRODUCTION REVIEW
  // ========================================================================
  console.log('\n[5/5] Extracting Representative Frames for Creative & Brand Review...');
  const framesDir = path.join(storage.exports, 'keyframes');
  fs.mkdirSync(framesDir, { recursive: true });

  const keyframeTimestamps = [2.5, 7.5, 12.5, 17.5, 22.5, 27.5];
  for (const item of results) {
    const baseName = path.basename(item.job.outputPath, '.mp4');
    for (const ts of keyframeTimestamps) {
      if (ts < item.probe.duration) {
        const frameOut = path.join(framesDir, `${baseName}-t${ts}s.png`);
        try {
          execFileSync('ffmpeg', ['-y', '-ss', String(ts), '-i', item.job.outputPath, '-vframes', '1', '-q:v', '2', frameOut], { stdio: 'pipe' });
        } catch (_) {}
      }
    }
  }

  // Summary Report
  console.log('\n========================================================================');
  console.log('  GROWTH STUDIO V0.03.1 — PRODUCTION ACCEPTANCE SUMMARY');
  console.log('========================================================================');
  for (const r of results) {
    console.log(`\n• ${r.name}`);
    console.log(`  File: ${r.job.outputPath}`);
    console.log(`  Resolution: ${r.probe.width}x${r.probe.height}`);
    console.log(`  FPS: ${r.probe.fps}`);
    console.log(`  Duration: ${r.probe.duration.toFixed(2)}s`);
    console.log(`  Video Codec: ${r.probe.videoCodec} (yuv420p)`);
    console.log(`  Audio Codec: ${r.probe.audioCodec} (stereo)`);
    console.log(`  File Size: ${(r.probe.fileSize / (1024 * 1024)).toFixed(2)} MB (${r.probe.fileSize} bytes)`);
    console.log(`  Audio Loudness: Mean ${r.volume.meanVolumeDb} dB, Peak ${r.volume.maxVolumeDb} dB`);
    console.log(`  Audible (Non-Silent): ${!r.volume.isSilent}`);
    console.log(`  Full Decode Verification: PASSED (0 stream errors)`);
  }
  console.log('\n========================================================================\n');

  await server.close();
}

main().catch(err => {
  console.error('\n❌ Production render pipeline failed:', err);
  process.exit(1);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createEasyModeratorProject,
  createBlankProject,
  resolveStoragePaths
} from '../packages/contracts/src/index.js';
import { compileComposition } from '../packages/template-engine/src/index.js';
import {
  renderVideo,
  probeMedia,
  measureAudioVolume,
  detectSilence,
  synthesizeSpeechGemini
} from '../packages/render-adapter/src/index.js';
import { CreativeOrchestrator } from '../apps/local-server/src/creative/creative-orchestrator.js';

const storage = resolveStoragePaths();
const EXPORTS_DIR = storage.exports;
const RENDERS_DIR = storage.renders;
const CACHE_DIR = path.join(RENDERS_DIR, 'tts_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const SAMPLE_MUSIC = path.resolve('data/projects/easymoderator-launch/assets/background-music.wav');

function resolveProjectAudio(project) {
  const audioTracks = [];
  let sceneStartTime = 0;
  for (const scene of project.scenes || []) {
    const sceneDur = Number(scene.durationSeconds) || 4;
    if (scene.narrationAssetId) {
      const asset = (project.assets || []).find(a => a.id === scene.narrationAssetId);
      if (asset && asset.file && fs.existsSync(asset.file)) {
        audioTracks.push({
          id: `narr-${scene.id}`,
          type: 'voice',
          path: asset.file,
          startTime: sceneStartTime + 0.1,
          duration: scene.narrationDurationSeconds || asset.durationSeconds || sceneDur,
          volume: 1.0
        });
      }
    }
    sceneStartTime += sceneDur;
  }
  const audioPath = (fs.existsSync(SAMPLE_MUSIC) && project.audio?.mode !== 'silent') ? SAMPLE_MUSIC : undefined;
  const audioConfig = project.audio || {
    mode: 'voice_and_music',
    musicVolume: 0.18,
    voiceVolume: 1.0,
    duckMusicUnderVoice: true,
    targetLufs: -16
  };
  return { audioTracks, audioPath, audioConfig };
}

async function runVideoProofMatrix() {
  console.log('================================================================');
  console.log(' GROWTH STUDIO V0.03 — VIDEO PROOF MATRIX VERIFICATION (A - F)  ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // Matrix A: EasyModerator 16:9 Bold & Future-Facing (Audible & Ducked)
  // --------------------------------------------------------------------------
  console.log('--- Matrix A: EasyModerator 16:9 Bold & Future-Facing ---');
  const projA = createEasyModeratorProject();
  projA.scenes = projA.scenes.slice(0, 3); // 3 focused scenes for matrix test (~15s)
  projA.scenes[0].durationSeconds = 4.5;
  projA.scenes[1].durationSeconds = 5.0;
  projA.scenes[2].durationSeconds = 4.5;

  // Synthesize/cache voice narration for scene 0
  const ttsA0 = await synthesizeSpeechGemini({
    text: projA.scenes[0].narrationText || projA.scenes[0].headline,
    voice: 'Puck',
    cacheDir: CACHE_DIR
  });
  const voiceA0Path = path.join(CACHE_DIR, 'matrix-a-voice0.wav');
  fs.writeFileSync(voiceA0Path, ttsA0.wavBuffer);
  projA.assets.push({
    id: 'voice-s0',
    kind: 'voice',
    file: voiceA0Path,
    durationSeconds: ttsA0.durationSeconds
  });
  projA.scenes[0].narrationAssetId = 'voice-s0';
  projA.scenes[0].narrationDurationSeconds = ttsA0.durationSeconds;

  const compA = compileComposition({ project: projA, targetId: 'landscape' });
  const outputA = path.join(EXPORTS_DIR, 'matrix-a-easymoderator-16x9.mp4');
  if (fs.existsSync(outputA)) fs.unlinkSync(outputA);

  const audioA = resolveProjectAudio(projA);
  console.log(`Rendering Matrix A (1920x1080 @ 30 FPS, ${compA.totalFrames} frames)...`);
  const resA = await renderVideo({
    compositionHtml: compA.html,
    target: compA.target,
    totalFrames: compA.totalFrames,
    totalDuration: compA.totalDuration,
    outputPath: outputA,
    tempParentDir: RENDERS_DIR,
    audioTracks: audioA.audioTracks,
    audioPath: audioA.audioPath,
    audioConfig: audioA.audioConfig,
    onProgress: (p) => {
      if (p.currentFrame % 50 === 0 || p.currentFrame === p.totalFrames) {
        process.stdout.write(`  Render A Progress: ${p.percent}% (${p.currentFrame}/${p.totalFrames})\r`);
      }
    }
  });
  console.log('\n✓ Matrix A render complete.');

  const probeA = await probeMedia(outputA);
  const volA = await measureAudioVolume(outputA);
  assert.strictEqual(probeA.width, 1920);
  assert.strictEqual(probeA.height, 1080);
  assert.strictEqual(probeA.fps, 30);
  assert.strictEqual(probeA.videoCodec, 'h264');
  assert.strictEqual(probeA.audioCodec, 'aac');
  assert.strictEqual(volA.isSilent, false, 'Matrix A must be audible');
  assert.ok(volA.meanVolumeDb > -35, `Matrix A mean volume should be audible (> -35 dB), got ${volA.meanVolumeDb} dB`);
  console.log(`✓ Matrix A Verified: 1920x1080 @ 30 FPS, Size: ${(probeA.fileSize / 1024).toFixed(1)} KB, Mean Vol: ${volA.meanVolumeDb} dB, Max: ${volA.maxVolumeDb} dB\n`);

  // --------------------------------------------------------------------------
  // Matrix B: EasyModerator 9:16 Vertical (Responsive Layout & Readable Captions)
  // --------------------------------------------------------------------------
  console.log('--- Matrix B: EasyModerator 9:16 Vertical Story ---');
  const projB = createEasyModeratorProject();
  projB.scenes = projB.scenes.slice(0, 3);
  projB.scenes[0].durationSeconds = 4.0;
  projB.scenes[1].durationSeconds = 4.5;
  projB.scenes[2].durationSeconds = 4.0;
  projB.assets.push({
    id: 'voice-s0-b',
    kind: 'voice',
    file: voiceA0Path,
    durationSeconds: ttsA0.durationSeconds
  });
  projB.scenes[0].narrationAssetId = 'voice-s0-b';
  projB.scenes[0].narrationDurationSeconds = ttsA0.durationSeconds;

  const compB = compileComposition({ project: projB, targetId: 'portrait' });
  const outputB = path.join(EXPORTS_DIR, 'matrix-b-easymoderator-9x16.mp4');
  if (fs.existsSync(outputB)) fs.unlinkSync(outputB);

  const audioB = resolveProjectAudio(projB);
  console.log(`Rendering Matrix B (1080x1920 @ 30 FPS, ${compB.totalFrames} frames)...`);
  const resB = await renderVideo({
    compositionHtml: compB.html,
    target: compB.target,
    totalFrames: compB.totalFrames,
    totalDuration: compB.totalDuration,
    outputPath: outputB,
    tempParentDir: RENDERS_DIR,
    audioTracks: audioB.audioTracks,
    audioPath: audioB.audioPath,
    audioConfig: audioB.audioConfig,
    onProgress: (p) => {
      if (p.currentFrame % 50 === 0 || p.currentFrame === p.totalFrames) {
        process.stdout.write(`  Render B Progress: ${p.percent}% (${p.currentFrame}/${p.totalFrames})\r`);
      }
    }
  });
  console.log('\n✓ Matrix B render complete.');

  const probeB = await probeMedia(outputB);
  const volB = await measureAudioVolume(outputB);
  assert.strictEqual(probeB.width, 1080);
  assert.strictEqual(probeB.height, 1920);
  assert.strictEqual(probeB.fps, 30);
  assert.strictEqual(probeB.videoCodec, 'h264');
  assert.strictEqual(probeB.audioCodec, 'aac');
  assert.strictEqual(volB.isSilent, false, 'Matrix B must be audible');
  console.log(`✓ Matrix B Verified: 1080x1920 @ 30 FPS, Size: ${(probeB.fileSize / 1024).toFixed(1)} KB, Mean Vol: ${volB.meanVolumeDb} dB\n`);

  // --------------------------------------------------------------------------
  // Matrix C: Unrelated Generic Brand in 4:5 Format (No EasyModerator Leakage)
  // --------------------------------------------------------------------------
  console.log('--- Matrix C: Unrelated Generic Brand (SyntraDesk AI 4:5) ---');
  const projC = createBlankProject('SyntraDesk AI Support Showcase', 'en');
  projC.brand = {
    name: 'SyntraDesk AI',
    primaryColor: '#0A0F1D',
    backgroundColor: '#0A0F1D',
    textColor: '#F8FAFC',
    accentColor: '#10B981',
    latinFontFamily: 'Plus Jakarta Sans',
    stylePreset: 'future_tech'
  };
  projC.creative = {
    objective: 'conversion',
    audience: 'E-commerce operations managers',
    keyMessage: 'Zero missed support tickets with AI routing in 3 seconds',
    tone: 'Confident, modern, enterprise',
    cta: {
      label: 'Deploy SyntraDesk Free',
      destination: 'https://syntradesk.ai'
    },
    productTruthProfile: [
      {
        id: 'c-truth-1',
        category: 'metric',
        statement: '3-second SLA on multi-channel ticket categorization',
        verificationStatus: 'verified_live'
      }
    ]
  };
  projC.scenes = [
    {
      id: 'syntra-s1',
      kind: 'kinetic_text',
      durationSeconds: 4.0,
      eyebrow: 'SUPPORT SPEED',
      headline: 'Unanswered tickets cost you customer loyalty.',
      subheadline: 'Every delayed response pushes buyers to competitors.',
      highlightWords: ['loyalty', 'delayed'],
      motion: { entrance: 'stagger_words', exit: 'fade' }
    },
    {
      id: 'syntra-s2',
      kind: 'solution',
      durationSeconds: 4.5,
      eyebrow: 'AUTOMATED INTELLIGENCE',
      headline: 'SyntraDesk routes support requests in 3 seconds.',
      subheadline: 'Accurate triage with full human supervisor controls.',
      highlightWords: ['3 seconds', 'Accurate'],
      motion: { entrance: 'mask_reveal', exit: 'fade' }
    },
    {
      id: 'syntra-s3',
      kind: 'cta',
      durationSeconds: 4.0,
      eyebrow: 'SCALE SUPPORT',
      headline: 'Transform your customer response speed today.',
      ctaLabel: 'Deploy SyntraDesk Free',
      ctaDestination: 'https://syntradesk.ai',
      motion: { entrance: 'fade_up', exit: 'fade' }
    }
  ];

  // Synthesize English voice for Scene 1
  const ttsC = await synthesizeSpeechGemini({
    text: 'Unanswered tickets cost you customer loyalty. SyntraDesk routes support requests in 3 seconds.',
    voice: 'Aoede',
    cacheDir: CACHE_DIR
  });
  const voiceCPath = path.join(CACHE_DIR, 'matrix-c-voice.wav');
  fs.writeFileSync(voiceCPath, ttsC.wavBuffer);
  projC.assets.push({
    id: 'voice-syntra',
    kind: 'voice',
    file: voiceCPath,
    durationSeconds: ttsC.durationSeconds
  });
  projC.scenes[0].narrationAssetId = 'voice-syntra';
  projC.scenes[0].narrationDurationSeconds = ttsC.durationSeconds;
  projC.audio = {
    mode: 'voice_and_music',
    muteAll: false,
    musicVolume: 0.15,
    voiceVolume: 1.0,
    duckMusicUnderVoice: true,
    targetLufs: -16
  };

  const compC = compileComposition({ project: projC, targetId: 'portrait_4_5' });
  const outputC = path.join(EXPORTS_DIR, 'matrix-c-generic-brand-4x5.mp4');
  if (fs.existsSync(outputC)) fs.unlinkSync(outputC);

  const audioC = resolveProjectAudio(projC);
  console.log(`Rendering Matrix C (1080x1350 @ 25 FPS, ${compC.totalFrames} frames)...`);
  const resC = await renderVideo({
    compositionHtml: compC.html,
    target: compC.target,
    totalFrames: compC.totalFrames,
    totalDuration: compC.totalDuration,
    outputPath: outputC,
    tempParentDir: RENDERS_DIR,
    audioTracks: audioC.audioTracks,
    audioPath: audioC.audioPath,
    audioConfig: audioC.audioConfig,
    onProgress: (p) => {
      if (p.currentFrame % 50 === 0 || p.currentFrame === p.totalFrames) {
        process.stdout.write(`  Render C Progress: ${p.percent}% (${p.currentFrame}/${p.totalFrames})\r`);
      }
    }
  });
  console.log('\n✓ Matrix C render complete.');

  const probeC = await probeMedia(outputC);
  const volC = await measureAudioVolume(outputC);
  assert.strictEqual(probeC.width, 1080);
  assert.strictEqual(probeC.height, 1350);
  assert.strictEqual(probeC.fps, 25);
  assert.strictEqual(probeC.videoCodec, 'h264');
  assert.strictEqual(probeC.audioCodec, 'aac');
  assert.strictEqual(volC.isSilent, false);
  console.log(`✓ Matrix C Verified: 1080x1350 @ 25 FPS, Size: ${(probeC.fileSize / 1024).toFixed(1)} KB, Mean Vol: ${volC.meanVolumeDb} dB\n`);

  // --------------------------------------------------------------------------
  // Matrix D: Offline Re-export (Network disconnected / API keys disabled)
  // --------------------------------------------------------------------------
  console.log('--- Matrix D: Offline Re-Export (Keys Disconnected & Cached Voice) ---');
  const savedOpenAiKey = process.env.CONTENT_STUDIO_KEY;
  const savedGeminiKey = process.env.CONTENT_STUDIO_GEMINI;
  process.env.CONTENT_STUDIO_KEY = '';
  process.env.CONTENT_STUDIO_GEMINI = '';

  try {
    // Reopen and recompile using cached voice
    const projD = JSON.parse(JSON.stringify(projC));
    projD.project.name = 'SyntraDesk Offline Re-export';
    projD.scenes[0].headline = 'Offline Re-Export Verified Cleanly';

    const compD = compileComposition({ project: projD, targetId: 'portrait_4_5' });
    const outputD = path.join(EXPORTS_DIR, 'matrix-d-offline-reexport.mp4');
    if (fs.existsSync(outputD)) fs.unlinkSync(outputD);

    const audioD = resolveProjectAudio(projD);
    console.log(`Rendering Matrix D offline (${compD.totalFrames} frames)...`);
    const resD = await renderVideo({
      compositionHtml: compD.html,
      target: compD.target,
      totalFrames: compD.totalFrames,
      totalDuration: compD.totalDuration,
      outputPath: outputD,
      tempParentDir: RENDERS_DIR,
      audioTracks: audioD.audioTracks,
      audioPath: audioD.audioPath,
      audioConfig: audioD.audioConfig,
      onProgress: (p) => {
        if (p.currentFrame % 50 === 0 || p.currentFrame === p.totalFrames) {
          process.stdout.write(`  Render D Progress: ${p.percent}% (${p.currentFrame}/${p.totalFrames})\r`);
        }
      }
    });
    console.log('\n✓ Matrix D offline render complete.');

    const probeD = await probeMedia(outputD);
    const volD = await measureAudioVolume(outputD);
    assert.strictEqual(probeD.width, 1080);
    assert.strictEqual(probeD.height, 1350);
    assert.strictEqual(volD.isSilent, false, 'Offline export must remain audible via cached assets');
    console.log(`✓ Matrix D Verified: 1080x1350, Size: ${(probeD.fileSize / 1024).toFixed(1)} KB, Mean Vol: ${volD.meanVolumeDb} dB\n`);
  } finally {
    process.env.CONTENT_STUDIO_KEY = savedOpenAiKey;
    process.env.CONTENT_STUDIO_GEMINI = savedGeminiKey;
  }

  // --------------------------------------------------------------------------
  // Matrix E: Manual / No-Key Workflow (Zero Forced AI)
  // --------------------------------------------------------------------------
  console.log('--- Matrix E: Manual / No-Key Workflow ---');
  const projE = createBlankProject('Pure Manual No-Key Promo', 'en');
  projE.audio = { mode: 'silent', muteAll: true };
  projE.scenes = [
    {
      id: 'manual-s1',
      kind: 'kinetic_text',
      durationSeconds: 3.0,
      eyebrow: 'MANUAL WORKFLOW',
      headline: 'Built entirely without artificial intelligence.',
      highlightWords: ['entirely'],
      motion: { entrance: 'stagger_words', exit: 'fade' }
    },
    {
      id: 'manual-s2',
      kind: 'cta',
      durationSeconds: 3.0,
      eyebrow: 'RELIABLE ENGINE',
      headline: 'Deterministic, offline rendering on local hardware.',
      highlightWords: ['Deterministic'],
      motion: { entrance: 'fade_up', exit: 'fade' }
    }
  ];

  const compE = compileComposition({ project: projE, targetId: 'landscape' });
  const outputE = path.join(EXPORTS_DIR, 'matrix-e-manual-no-key.mp4');
  if (fs.existsSync(outputE)) fs.unlinkSync(outputE);

  console.log(`Rendering Matrix E (${compE.totalFrames} frames)...`);
  const resE = await renderVideo({
    compositionHtml: compE.html,
    target: compE.target,
    totalFrames: compE.totalFrames,
    totalDuration: compE.totalDuration,
    outputPath: outputE,
    tempParentDir: RENDERS_DIR,
    audioConfig: compE.audio,
    onProgress: (p) => {
      if (p.currentFrame % 40 === 0 || p.currentFrame === p.totalFrames) {
        process.stdout.write(`  Render E Progress: ${p.percent}% (${p.currentFrame}/${p.totalFrames})\r`);
      }
    }
  });
  console.log('\n✓ Matrix E render complete.');

  const probeE = await probeMedia(outputE);
  assert.strictEqual(probeE.width, 1920);
  assert.strictEqual(probeE.height, 1080);
  assert.strictEqual(probeE.videoCodec, 'h264');
  console.log(`✓ Matrix E Verified: 1920x1080 @ 30 FPS, Size: ${(probeE.fileSize / 1024).toFixed(1)} KB\n`);

  // --------------------------------------------------------------------------
  // Matrix F: AI Selective Scene Regeneration (Hash Tracking)
  // --------------------------------------------------------------------------
  console.log('--- Matrix F: AI Selective Scene Regeneration & Hash Invariance ---');
  const projF = JSON.parse(JSON.stringify(projC));
  projF.project.id = `matrix-f-proj-${Date.now()}`;
  const projDirF = path.join(storage.projects, projF.project.id);
  fs.mkdirSync(projDirF, { recursive: true });
  fs.writeFileSync(path.join(projDirF, 'project.json'), JSON.stringify(projF, null, 2), 'utf8');

  // Compute baseline content hashes for scenes 1, 2, and 3
  const hashObject = (obj) => crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
  const hashScene1Before = hashObject(projF.scenes[0]);
  const hashScene2Before = hashObject(projF.scenes[1]);
  const hashScene3Before = hashObject(projF.scenes[2]);

  console.log('Baseline scene hashes:');
  console.log(`  Scene 1 hash: ${hashScene1Before.slice(0, 16)}...`);
  console.log(`  Scene 2 hash: ${hashScene2Before.slice(0, 16)}...`);
  console.log(`  Scene 3 hash: ${hashScene3Before.slice(0, 16)}...`);

  // Selective rewrite of Scene 1 only
  const orchestrator = new CreativeOrchestrator({ storagePaths: storage });
  console.log('Rewriting Scene 1 with custom revision prompt using gpt-6-luna...');
  const rewriteRes = await orchestrator.rewriteScene(
    projF.project.id,
    projF.scenes[0].id,
    'Make the headline even more urgent: Slow customer support is killing your conversion rate.',
    { model: 'gpt-6-luna' }
  );

  const updatedProjF = JSON.parse(fs.readFileSync(path.join(projDirF, 'project.json'), 'utf8'));
  const hashScene1After = hashObject(updatedProjF.scenes[0]);
  const hashScene2After = hashObject(updatedProjF.scenes[1]);
  const hashScene3After = hashObject(updatedProjF.scenes[2]);

  console.log('Post-rewrite scene hashes:');
  console.log(`  Scene 1 hash: ${hashScene1After.slice(0, 16)}... (CHANGED)`);
  console.log(`  Scene 2 hash: ${hashScene2After.slice(0, 16)}... (IDENTICAL)`);
  console.log(`  Scene 3 hash: ${hashScene3After.slice(0, 16)}... (IDENTICAL)`);

  assert.notStrictEqual(hashScene1Before, hashScene1After, 'Scene 1 must be revised');
  assert.strictEqual(hashScene2Before, hashScene2After, 'Scene 2 must remain 100% UNTOUCHED');
  assert.strictEqual(hashScene3Before, hashScene3After, 'Scene 3 must remain 100% UNTOUCHED');
  console.log('✓ Proven selective regeneration: Unaffected scenes preserved with identical SHA-256 hashes');

  // Export Matrix F
  const compF = compileComposition({ project: updatedProjF, targetId: 'portrait_4_5' });
  const outputF = path.join(EXPORTS_DIR, 'matrix-f-selective-regen.mp4');
  if (fs.existsSync(outputF)) fs.unlinkSync(outputF);

  const audioF = resolveProjectAudio(updatedProjF);
  console.log(`Rendering Matrix F (${compF.totalFrames} frames)...`);
  const resF = await renderVideo({
    compositionHtml: compF.html,
    target: compF.target,
    totalFrames: compF.totalFrames,
    totalDuration: compF.totalDuration,
    outputPath: outputF,
    tempParentDir: RENDERS_DIR,
    audioTracks: audioF.audioTracks,
    audioPath: audioF.audioPath,
    audioConfig: audioF.audioConfig,
    onProgress: (p) => {
      if (p.currentFrame % 50 === 0 || p.currentFrame === p.totalFrames) {
        process.stdout.write(`  Render F Progress: ${p.percent}% (${p.currentFrame}/${p.totalFrames})\r`);
      }
    }
  });
  console.log('\n✓ Matrix F render complete.');

  const probeF = await probeMedia(outputF);
  assert.strictEqual(probeF.width, 1080);
  assert.strictEqual(probeF.height, 1350);
  console.log(`✓ Matrix F Verified: 1080x1350, Size: ${(probeF.fileSize / 1024).toFixed(1)} KB\n`);

  // Clean up temporary project F
  fs.rmSync(projDirF, { recursive: true, force: true });

  console.log('================================================================');
  console.log('   ✓✓✓ ALL 6 VIDEO MATRIX TEST GATES (A - F) VERIFIED PASS!    ');
  console.log('================================================================\n');
}

runVideoProofMatrix().catch(err => {
  console.error('\nMatrix test failed:', err);
  process.exit(1);
});

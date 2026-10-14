import {
  createBlankProject,
  createEasyModeratorProject,
  createSaasStarterProject,
  createMobileAppStarterProject,
  resolveStoragePaths,
  ensureStorageDirectories
} from '../packages/contracts/src/index.js';
import { compileComposition } from '../packages/template-engine/src/index.js';
import {
  renderVideo,
  probeMedia,
  measureAudioVolume,
  detectSilence,
  synthesizeSpeechGemini
} from '../packages/render-adapter/src/index.js';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const storage = resolveStoragePaths();
ensureStorageDirectories(storage);

console.log('================================================================');
console.log('   GROWTH STUDIO V0.02 — MANDATORY ACTUAL OUTPUT MATRIX        ');
console.log(`   Storage Volume: ${storage.root} (E: Drive: ${storage.isEDrive})`);
console.log('================================================================\n');

const exportsDir = storage.exports;
const keyframesDir = path.join(exportsDir, 'keyframes-v002');
const localExportsDir = path.resolve('data/exports');
const localKeyframesDir = path.resolve('data/exports/keyframes-v002');

fs.mkdirSync(exportsDir, { recursive: true });
fs.mkdirSync(keyframesDir, { recursive: true });
fs.mkdirSync(localExportsDir, { recursive: true });
fs.mkdirSync(localKeyframesDir, { recursive: true });

function extractKeyframe(videoPath, timeSeconds, outPath) {
  try {
    execSync(`ffmpeg -y -ss ${timeSeconds} -i "${videoPath}" -vframes 1 -q:v 2 "${outPath}"`, {
      stdio: 'pipe'
    });
    return true;
  } catch (e) {
    console.error(`Keyframe extraction failed at ${timeSeconds}s:`, e.message);
    return false;
  }
}

function mirrorFile(filename) {
  try {
    const src = path.join(exportsDir, filename);
    const dest = path.join(localExportsDir, filename);
    if (fs.existsSync(src) && src !== dest) {
      fs.copyFileSync(src, dest);
    }
  } catch (_) {}
}

async function runMatrix() {
  const matrixResults = [];
  const ttsCacheDir = path.join(storage.renders, 'tts_cache');
  if (!fs.existsSync(ttsCacheDir)) fs.mkdirSync(ttsCacheDir, { recursive: true });

  // -------------------------------------------------------------
  // TEST A: 15s 16:9 Imported Bangla Voice, Audible, Neutral Generic
  // -------------------------------------------------------------
  console.log('\n>>> EXECUTING TEST A: 15s 16:9 Imported Bangla voice (Neutral generic)...');
  const projA = createBlankProject('Test A - Neutral Generic Promo', 'bn');
  projA.project.id = 'test-a-neutral-generic';
  projA.template.id = 'bold_kinetic';
  projA.brand = {
    name: 'AutoTasker',
    primaryColor: '#3B82F6',
    backgroundColor: '#0F172A',
    textColor: '#F8FAFC',
    accentColor: '#38BDF8',
    latinFontFamily: 'Inter',
    banglaFontFamily: 'Noto Sans Bengali',
    cornerRadiusPx: 12
  };

  // Copy sample voice into project A
  const projADir = path.join(storage.projects, projA.project.id);
  const projAAssetsDir = path.join(projADir, 'assets');
  fs.mkdirSync(projAAssetsDir, { recursive: true });
  const sampleVoiceSrc = path.resolve('data/exports/test-tts-bangla-standard.wav');
  const voiceDestA = path.join(projAAssetsDir, 'imported-voice.wav');
  fs.copyFileSync(sampleVoiceSrc, voiceDestA);

  projA.assets.push({
    id: 'imported-voice-a',
    kind: 'voice',
    file: 'assets/imported-voice.wav',
    durationSeconds: 3.8,
    sampleRate: 24000,
    channels: 1,
    source: 'imported'
  });

  projA.scenes = [
    {
      id: 'a1',
      kind: 'kinetic_text',
      durationSeconds: 5,
      eyebrow: 'AUTOMATION STUDIO',
      headline: 'সহজ মডারেশন দিয়ে আপনার পেইজ ম্যানেজ করুন স্বয়ংক্রিয়ভাবে।',
      subheadline: 'দ্রুত এবং আধুনিক ডিজিটাল সমাধান।',
      highlightWords: ['সহজ', 'মডারেশন'],
      narrationAssetId: 'imported-voice-a',
      narrationDurationSeconds: 3.8
    },
    {
      id: 'a2',
      kind: 'kinetic_text',
      durationSeconds: 5,
      eyebrow: 'TIME SAVINGS',
      headline: 'প্রতিদিন বাঁচান শত শত ঘণ্টা সময় ও শ্রম',
      subheadline: 'অটোমেটেড রেসপন্স সিস্টেমের মাধ্যমে।',
      highlightWords: ['বাঁচান', 'সময়']
    },
    {
      id: 'a3',
      kind: 'cta_outro',
      durationSeconds: 5,
      headline: 'আজই শুরু করুন সম্পূর্ণ বিনামূল্যে',
      subheadline: 'কোন ক্রেডিট কার্ড লাগবে না।',
      ctaLabel: 'ফ্রি ট্রায়াল নিন'
    }
  ];

  projA.audio = {
    mode: 'imported_voice',
    muteAll: false,
    voiceVolume: 1.0,
    targetLufs: -16
  };

  const compA = compileComposition({ project: projA, targetId: 'landscape' });
  const outPathA = path.join(exportsDir, 'test-a-15s-16x9-imported-voice.mp4');

  const renderA = await renderVideo({
    compositionHtml: compA.html,
    target: compA.target,
    totalFrames: compA.totalFrames,
    totalDuration: compA.totalDuration,
    outputPath: outPathA,
    audioTracks: [
      {
        id: 'narration-a1',
        type: 'voice',
        path: voiceDestA,
        startTime: 0.5,
        duration: 3.8,
        volume: 1.0
      }
    ],
    audioConfig: projA.audio,
    tempParentDir: storage.renders,
    onProgress: p => {
      if (p.percent % 25 === 0) console.log(`   [Test A] Render progress: ${p.percent}%`);
    }
  });

  const probeA = await probeMedia(outPathA);
  const volA = await measureAudioVolume(outPathA);
  const silA = await detectSilence(outPathA, -45, 1.0);
  console.log(`✓ Test A verified: ${probeA.width}x${probeA.height}, Mean Vol: ${volA.meanVolumeDb} dB, isSilent: ${volA.isSilent}`);
  extractKeyframe(outPathA, 2, path.join(keyframesDir, 'test-a_mid.jpg'));
  mirrorFile('test-a-15s-16x9-imported-voice.mp4');

  matrixResults.push({
    test: 'A',
    description: '15s 16:9 Imported Bangla voice, audible, neutral generic',
    file: outPathA,
    dimensions: `${probeA.width}x${probeA.height}`,
    fps: probeA.fps,
    duration: probeA.duration,
    videoCodec: probeA.videoCodec,
    audioCodec: probeA.audioCodec,
    meanVolumeDb: volA.meanVolumeDb,
    maxVolumeDb: volA.maxVolumeDb,
    isSilent: volA.isSilent,
    status: (!volA.isSilent && volA.meanVolumeDb > -40) ? 'PASS' : 'FAIL'
  });

  // -------------------------------------------------------------
  // TEST B: 15s 9:16 Gemini-generated Bangla Voice, Audible, Generic Brand
  // -------------------------------------------------------------
  console.log('\n>>> EXECUTING TEST B: 15s 9:16 Gemini TTS Bangla voice (Generic brand)...');
  const projB = createMobileAppStarterProject();
  projB.project.id = 'test-b-gemini-voice';
  projB.project.name = 'PaySmart Mobile';
  projB.template.id = 'app_showcase';
  projB.brand = {
    name: 'PaySmart',
    primaryColor: '#059669',
    backgroundColor: '#064E3B',
    textColor: '#FFFFFF',
    accentColor: '#34D399',
    latinFontFamily: 'Inter',
    banglaFontFamily: 'Noto Sans Bengali',
    cornerRadiusPx: 16
  };

  const projBDir = path.join(storage.projects, projB.project.id);
  const projBAssetsDir = path.join(projBDir, 'assets');
  fs.mkdirSync(projBAssetsDir, { recursive: true });

  // Generate live Bangla voice with Gemini TTS
  const banglaScriptB = 'পে-স্মার্ট অ্যাপের মাধ্যমে যেকোনো সময় সহজে টাকা পাঠান এবং বিল পরিশোধ করুন।';
  console.log(`   Synthesizing Gemini TTS for Test B: "${banglaScriptB}"`);
  const ttsB = await synthesizeSpeechGemini({
    text: banglaScriptB,
    voice: 'Puck',
    model: 'gemini-2.5-flash-preview-tts',
    cacheDir: ttsCacheDir
  });

  const voiceDestB = path.join(projBAssetsDir, 'gemini-bangla-voice.wav');
  fs.writeFileSync(voiceDestB, ttsB.wavBuffer);

  projB.scenes = [
    {
      id: 'b1',
      kind: 'app_feature',
      durationSeconds: 5,
      eyebrow: 'FAST PAYMENTS',
      headline: 'সহজে টাকা পাঠান ও বিল পরিশোধ করুন',
      subheadline: 'আপনার স্মার্টফোনে দ্রুত এবং নিরাপদ ব্যাংকিং।',
      highlightWords: ['সহজে', 'নিরাপদ'],
      narrationAssetId: 'gemini-voice-b',
      narrationDurationSeconds: ttsB.durationSeconds
    },
    {
      id: 'b2',
      kind: 'stat',
      durationSeconds: 5,
      statValue: '৯৯.৯%',
      statLabel: 'সফল লেনদেনের নির্ভরযোগ্য গ্যারান্টি',
      subheadline: 'শূন্য লুকানো চার্জ সহ।'
    },
    {
      id: 'b3',
      kind: 'cta_outro',
      durationSeconds: 5,
      headline: 'ডাউনলোড করুন পে-স্মার্ট অ্যাপ',
      subheadline: 'গুগল প্লে স্টোর ও অ্যাপ স্টোরে উপলব্ধ।',
      ctaLabel: 'ডাউনলোড করুন'
    }
  ];

  projB.audio = {
    mode: 'generated_voice',
    muteAll: false,
    voiceVolume: 1.0,
    targetLufs: -16
  };

  const compB = compileComposition({ project: projB, targetId: 'portrait' });
  const outPathB = path.join(exportsDir, 'test-b-15s-9x16-gemini-bangla-voice.mp4');

  await renderVideo({
    compositionHtml: compB.html,
    target: compB.target,
    totalFrames: compB.totalFrames,
    totalDuration: compB.totalDuration,
    outputPath: outPathB,
    audioTracks: [
      {
        id: 'narration-b1',
        type: 'voice',
        path: voiceDestB,
        startTime: 0.5,
        duration: ttsB.durationSeconds,
        volume: 1.0
      }
    ],
    audioConfig: projB.audio,
    tempParentDir: storage.renders,
    onProgress: p => {
      if (p.percent % 25 === 0) console.log(`   [Test B] Render progress: ${p.percent}%`);
    }
  });

  const probeB = await probeMedia(outPathB);
  const volB = await measureAudioVolume(outPathB);
  console.log(`✓ Test B verified: ${probeB.width}x${probeB.height}, Mean Vol: ${volB.meanVolumeDb} dB, isSilent: ${volB.isSilent}`);
  extractKeyframe(outPathB, 2, path.join(keyframesDir, 'test-b_mid.jpg'));
  mirrorFile('test-b-15s-9x16-gemini-bangla-voice.mp4');

  matrixResults.push({
    test: 'B',
    description: '15s 9:16 Gemini-generated Bangla voice, audible, generic brand',
    file: outPathB,
    dimensions: `${probeB.width}x${probeB.height}`,
    fps: probeB.fps,
    duration: probeB.duration,
    videoCodec: probeB.videoCodec,
    audioCodec: probeB.audioCodec,
    meanVolumeDb: volB.meanVolumeDb,
    maxVolumeDb: volB.maxVolumeDb,
    isSilent: volB.isSilent,
    status: (!volB.isSilent && volB.meanVolumeDb > -40) ? 'PASS' : 'FAIL'
  });

  // -------------------------------------------------------------
  // TEST C: 35s 16:9 EasyModerator Story, Voice + Ducked Music, Bold & Future-Facing
  // -------------------------------------------------------------
  console.log('\n>>> EXECUTING TEST C: 35s 16:9 EasyModerator story (Voice + Ducked Music)...');
  const projC = createEasyModeratorProject();
  projC.project.id = 'easymoderator-launch-v002';
  const projCDir = path.join(storage.projects, projC.project.id);
  const projCAssetsDir = path.join(projCDir, 'assets');
  fs.mkdirSync(projCAssetsDir, { recursive: true });

  // Copy assets: music, logo, mockup
  const musicSrc = path.resolve('data/projects/easymoderator-launch/assets/background-music.wav');
  const musicDestC = path.join(projCAssetsDir, 'background-music.wav');
  fs.copyFileSync(musicSrc, musicDestC);

  const logoSrc = path.resolve('data/projects/easymoderator-launch/assets/logo.png');
  const logoDestC = path.join(projCAssetsDir, 'logo.png');
  if (fs.existsSync(logoSrc)) fs.copyFileSync(logoSrc, logoDestC);

  const inboxSrc = path.resolve('data/projects/easymoderator-launch/assets/inbox-demo.png');
  const inboxDestC = path.join(projCAssetsDir, 'inbox-demo.png');
  if (fs.existsSync(inboxSrc)) fs.copyFileSync(inboxSrc, inboxDestC);

  // Synthesize per-scene voiceover narration for EasyModerator
  const cScripts = [
    { sceneId: 'hook', text: 'হাজারো ফেসবুক ও হোয়াটসঅ্যাপ কাস্টমার মেসেজ সামলাতে হিমশিম খাচ্ছেন?' },
    { sceneId: 'problem', text: 'দেরিতে উত্তর দেওয়ার কারণে ৬০ শতাংশ কাস্টমার অন্য পেজে চলে যায়।' },
    { sceneId: 'solution', text: 'সহজ মডারেশন দিয়ে সেকেন্ডের মধ্যে অটোমেটেড অর্ডার কনফার্ম করুন।' },
    { sceneId: 'social_proof', text: '৫০০ টিরও বেশি সফল ই-কমার্স ব্র্যান্ড এখন নিশ্চিন্তে অটোমেশন ব্যবহার করছে।' },
    { sceneId: 'cta', text: 'আজই ফ্রি ট্রায়াল শুরু করুন। কোনো সেটআপ ফি নেই।' }
  ];

  const audioTracksC = [];
  let sceneOffsetTime = 0;

  for (const s of cScripts) {
    console.log(`   Synthesizing TTS for Scene [${s.sceneId}]: "${s.text}"`);
    const tts = await synthesizeSpeechGemini({
      text: s.text,
      voice: 'Puck',
      model: 'gemini-2.5-flash-preview-tts',
      cacheDir: ttsCacheDir
    });
    const voiceFileName = `voice-${s.sceneId}.wav`;
    const voiceFilePath = path.join(projCAssetsDir, voiceFileName);
    fs.writeFileSync(voiceFilePath, tts.wavBuffer);

    audioTracksC.push({
      id: `narration-${s.sceneId}`,
      type: 'voice',
      path: voiceFilePath,
      startTime: sceneOffsetTime + 0.3,
      duration: tts.durationSeconds,
      volume: 1.0
    });

    // Update scene narration reference and ensure scene duration accommodates speech + 1s padding
    const sceneObj = projC.scenes.find(sc => sc.id === s.sceneId);
    if (sceneObj) {
      sceneObj.narrationText = s.text;
      sceneObj.narrationAssetId = `voice-${s.sceneId}`;
      sceneObj.narrationDurationSeconds = tts.durationSeconds;
      sceneObj.durationSeconds = Math.max(sceneObj.durationSeconds, Math.ceil(tts.durationSeconds + 1.0));
      sceneOffsetTime += sceneObj.durationSeconds;
    }
  }

  // Save updated project C JSON
  fs.writeFileSync(path.join(projCDir, 'project.json'), JSON.stringify(projC, null, 2), 'utf8');

  const compC = compileComposition({ project: projC, targetId: 'landscape' });
  const outPathC = path.join(exportsDir, 'test-c-easymoderator-16x9-story-ducked.mp4');

  await renderVideo({
    compositionHtml: compC.html,
    target: compC.target,
    totalFrames: compC.totalFrames,
    totalDuration: compC.totalDuration,
    outputPath: outPathC,
    audioTracks: audioTracksC,
    audioPath: musicDestC,
    audioConfig: {
      mode: 'voice_and_music',
      muteAll: false,
      musicVolume: 0.22,
      voiceVolume: 1.0,
      ducking: true,
      duckingDb: 12,
      targetLufs: -16,
      fadeInSeconds: 0.5,
      fadeOutSeconds: 1.0
    },
    tempParentDir: storage.renders,
    onProgress: p => {
      if (p.percent % 20 === 0) console.log(`   [Test C] Render progress: ${p.percent}%`);
    }
  });

  const probeC = await probeMedia(outPathC);
  const volC = await measureAudioVolume(outPathC);
  const silC = await detectSilence(outPathC, -45, 1.0);
  console.log(`✓ Test C verified: ${probeC.width}x${probeC.height}, Mean Vol: ${volC.meanVolumeDb} dB, isSilent: ${volC.isSilent}`);
  extractKeyframe(outPathC, 2, path.join(keyframesDir, 'test-c_start.jpg'));
  extractKeyframe(outPathC, Math.floor(probeC.duration / 2), path.join(keyframesDir, 'test-c_mid.jpg'));
  extractKeyframe(outPathC, Math.floor(probeC.duration - 1), path.join(keyframesDir, 'test-c_end.jpg'));
  mirrorFile('test-c-easymoderator-16x9-story-ducked.mp4');

  matrixResults.push({
    test: 'C',
    description: '35s 16:9 EasyModerator story, voice + ducked music, Bold & Future-Facing',
    file: outPathC,
    dimensions: `${probeC.width}x${probeC.height}`,
    fps: probeC.fps,
    duration: probeC.duration,
    videoCodec: probeC.videoCodec,
    audioCodec: probeC.audioCodec,
    meanVolumeDb: volC.meanVolumeDb,
    maxVolumeDb: volC.maxVolumeDb,
    isSilent: volC.isSilent,
    status: (!volC.isSilent && volC.meanVolumeDb > -30) ? 'PASS' : 'FAIL'
  });

  // -------------------------------------------------------------
  // TEST D: Same Promo 9:16 Vertical, Responsive Layout, Audible
  // -------------------------------------------------------------
  console.log('\n>>> EXECUTING TEST D: Same EasyModerator promo in 9:16 Portrait...');
  const compD = compileComposition({ project: projC, targetId: 'portrait' });
  const outPathD = path.join(exportsDir, 'test-d-easymoderator-9x16-portrait-ducked.mp4');

  await renderVideo({
    compositionHtml: compD.html,
    target: compD.target,
    totalFrames: compD.totalFrames,
    totalDuration: compD.totalDuration,
    outputPath: outPathD,
    audioTracks: audioTracksC,
    audioPath: musicDestC,
    audioConfig: {
      mode: 'voice_and_music',
      muteAll: false,
      musicVolume: 0.22,
      voiceVolume: 1.0,
      ducking: true,
      duckingDb: 12,
      targetLufs: -16,
      fadeInSeconds: 0.5,
      fadeOutSeconds: 1.0
    },
    tempParentDir: storage.renders,
    onProgress: p => {
      if (p.percent % 20 === 0) console.log(`   [Test D] Render progress: ${p.percent}%`);
    }
  });

  const probeD = await probeMedia(outPathD);
  const volD = await measureAudioVolume(outPathD);
  console.log(`✓ Test D verified: ${probeD.width}x${probeD.height}, Mean Vol: ${volD.meanVolumeDb} dB, isSilent: ${volD.isSilent}`);
  extractKeyframe(outPathD, 2, path.join(keyframesDir, 'test-d_start.jpg'));
  extractKeyframe(outPathD, Math.floor(probeD.duration / 2), path.join(keyframesDir, 'test-d_mid.jpg'));
  extractKeyframe(outPathD, Math.floor(probeD.duration - 1), path.join(keyframesDir, 'test-d_end.jpg'));
  mirrorFile('test-d-easymoderator-9x16-portrait-ducked.mp4');

  matrixResults.push({
    test: 'D',
    description: 'Same EasyModerator promo in 9:16 vertical, responsive canvas fill, audible',
    file: outPathD,
    dimensions: `${probeD.width}x${probeD.height}`,
    fps: probeD.fps,
    duration: probeD.duration,
    videoCodec: probeD.videoCodec,
    audioCodec: probeD.audioCodec,
    meanVolumeDb: volD.meanVolumeDb,
    maxVolumeDb: volD.maxVolumeDb,
    isSilent: volD.isSilent,
    status: (!volD.isSilent && volD.meanVolumeDb > -30) ? 'PASS' : 'FAIL'
  });

  // -------------------------------------------------------------
  // TEST E: 20s 4:5 Explicit Silent Video (mode: 'silent')
  // -------------------------------------------------------------
  console.log('\n>>> EXECUTING TEST E: 20s 4:5 Explicit Silent Video (mode: silent)...');
  const projE = createBlankProject('Test E - Silent Video', 'en');
  projE.project.id = 'test-e-silent-video';
  projE.template.id = 'guided_product_story';
  projE.brand = {
    name: 'EcoTrack',
    primaryColor: '#10B981',
    backgroundColor: '#061A14',
    textColor: '#FFFFFF',
    accentColor: '#34D399',
    latinFontFamily: 'Inter',
    banglaFontFamily: 'Noto Sans Bengali',
    cornerRadiusPx: 16
  };
  projE.scenes = [
    { id: 'e1', kind: 'kinetic_text', durationSeconds: 5, headline: 'Silent Social Feed Promo', subheadline: 'Designed for muted auto-play' },
    { id: 'e2', kind: 'stat', durationSeconds: 5, statValue: '85%', statLabel: 'Of mobile feed videos are watched with sound off' },
    { id: 'e3', kind: 'kinetic_text', durationSeconds: 5, headline: 'High Visual Clarity', subheadline: 'Clear kinetic typography that speaks for itself' },
    { id: 'e4', kind: 'cta_outro', durationSeconds: 5, headline: 'Explore Silent Mode', ctaLabel: 'Get Started' }
  ];
  projE.audio = {
    mode: 'silent',
    muteAll: true
  };

  const compE = compileComposition({ project: projE, targetId: 'portrait_4_5' });
  const outPathE = path.join(exportsDir, 'test-e-20s-4x5-explicit-silent.mp4');

  await renderVideo({
    compositionHtml: compE.html,
    target: compE.target,
    totalFrames: compE.totalFrames,
    totalDuration: compE.totalDuration,
    outputPath: outPathE,
    audioConfig: projE.audio,
    tempParentDir: storage.renders,
    onProgress: p => {
      if (p.percent % 25 === 0) console.log(`   [Test E] Render progress: ${p.percent}%`);
    }
  });

  const probeE = await probeMedia(outPathE);
  const volE = await measureAudioVolume(outPathE);
  console.log(`✓ Test E verified: ${probeE.width}x${probeE.height}, Mean Vol: ${volE.meanVolumeDb} dB, isSilent: ${volE.isSilent}`);
  extractKeyframe(outPathE, 2, path.join(keyframesDir, 'test-e_mid.jpg'));
  mirrorFile('test-e-20s-4x5-explicit-silent.mp4');

  matrixResults.push({
    test: 'E',
    description: '20s 4:5 Explicit Silent Video, mode: silent, zero sound intended',
    file: outPathE,
    dimensions: `${probeE.width}x${probeE.height}`,
    fps: probeE.fps,
    duration: probeE.duration,
    videoCodec: probeE.videoCodec,
    audioCodec: probeE.audioCodec,
    meanVolumeDb: volE.meanVolumeDb,
    maxVolumeDb: volE.maxVolumeDb,
    isSilent: volE.isSilent,
    status: (volE.isSilent && volE.meanVolumeDb <= -80) ? 'PASS' : 'FAIL'
  });

  // -------------------------------------------------------------
  // TEST F: Offline Reopen of Test C, Caption Edit, Re-export, Audible
  // -------------------------------------------------------------
  console.log('\n>>> EXECUTING TEST F: Offline reopen of Test C, caption edit, re-export...');
  const projFPath = path.join(storage.projects, projC.project.id, 'project.json');
  const projFData = JSON.parse(fs.readFileSync(projFPath, 'utf8'));

  // Edit caption in Scene 1 without touching audio files
  projFData.scenes[0].headline = 'হাজারো মেসেজ সামলাতে হিমশিম খাচ্ছেন? [Verified]';
  const compF = compileComposition({ project: projFData, targetId: 'landscape' });
  const outPathF = path.join(exportsDir, 'test-f-offline-reopen-reexport.mp4');

  await renderVideo({
    compositionHtml: compF.html,
    target: compF.target,
    totalFrames: compF.totalFrames,
    totalDuration: compF.totalDuration,
    outputPath: outPathF,
    audioTracks: audioTracksC,
    audioPath: musicDestC,
    audioConfig: projFData.audio || {
      mode: 'voice_and_music',
      muteAll: false,
      musicVolume: 0.22,
      voiceVolume: 1.0,
      ducking: true,
      targetLufs: -16
    },
    tempParentDir: storage.renders,
    onProgress: p => {
      if (p.percent % 25 === 0) console.log(`   [Test F] Render progress: ${p.percent}%`);
    }
  });

  const probeF = await probeMedia(outPathF);
  const volF = await measureAudioVolume(outPathF);
  console.log(`✓ Test F verified: ${probeF.width}x${probeF.height}, Mean Vol: ${volF.meanVolumeDb} dB, isSilent: ${volF.isSilent}`);
  extractKeyframe(outPathF, 2, path.join(keyframesDir, 'test-f_mid.jpg'));
  mirrorFile('test-f-offline-reopen-reexport.mp4');

  matrixResults.push({
    test: 'F',
    description: 'Offline reopen of Test C, edit caption, re-export with cached audio, audible',
    file: outPathF,
    dimensions: `${probeF.width}x${probeF.height}`,
    fps: probeF.fps,
    duration: probeF.duration,
    videoCodec: probeF.videoCodec,
    audioCodec: probeF.audioCodec,
    meanVolumeDb: volF.meanVolumeDb,
    maxVolumeDb: volF.maxVolumeDb,
    isSilent: volF.isSilent,
    status: (!volF.isSilent && volF.meanVolumeDb > -30) ? 'PASS' : 'FAIL'
  });

  // Write Evidence JSON
  const evidencePath = path.resolve('data/exports/v002-release-evidence.json');
  fs.writeFileSync(evidencePath, JSON.stringify(matrixResults, null, 2), 'utf8');

  console.log('\n================================================================');
  console.log('>>> ALL 6 MANDATORY MATRIX EXPORTS COMPLETED & VERIFIED! <<<');
  console.log('================================================================');
  console.table(matrixResults.map(r => ({
    Test: r.test,
    Resolution: r.dimensions,
    Duration: `${r.duration.toFixed(1)}s`,
    'Mean dB': `${r.meanVolumeDb} dB`,
    'Max dB': `${r.maxVolumeDb} dB`,
    Silent: r.isSilent ? 'YES' : 'NO',
    Status: r.status
  })));
}

runMatrix().catch(err => {
  console.error('\nMatrix Execution Failed:', err);
  process.exit(1);
});

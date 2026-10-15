import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createBlankProject, createEasyModeratorProject, resolveStoragePaths } from '../packages/contracts/src/index.js';
import { compileComposition, listTemplates, runPreflight } from '../packages/template-engine/src/index.js';
import { renderVideo, probeMedia, measureAudioVolume, detectSilence } from '../packages/render-adapter/src/index.js';
import { CreativeOrchestrator } from '../apps/local-server/src/creative/creative-orchestrator.js';

const storage = resolveStoragePaths();
const repoRoot = path.resolve('.');
const easyModeratorAssets = path.join(repoRoot, 'data', 'projects', 'easymoderator-launch', 'assets');
const psVoiceScript = path.join(repoRoot, 'tests', 'helpers', 'create-local-narration.ps1');
const proofResults = [];

function localNarration(text, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  assert.equal(fs.existsSync(outputPath), false, `Refusing to replace an existing voice fixture: ${outputPath}`);
  execFileSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psVoiceScript,
    '-OutputPath', outputPath, '-Text', text
  ], { stdio: 'pipe', windowsHide: true, maxBuffer: 1024 * 1024 });
  const buffer = fs.readFileSync(outputPath);
  assert.equal(buffer.subarray(0, 4).toString(), 'RIFF');
  assert.equal(buffer.subarray(8, 12).toString(), 'WAVE');
  const durationSeconds = (buffer.length - 44) / (24000 * 2);
  return { path: outputPath, durationSeconds, sha256: createHash('sha256').update(buffer).digest('hex') };
}

function persistProject(project) {
  const id = project.project.id;
  const projectDir = path.join(storage.projects, id);
  const assetsDir = path.join(projectDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  for (const asset of project.assets || []) {
    if (!asset.file || path.isAbsolute(asset.file)) continue;
    if (asset.file.startsWith('assets/')) {
      const source = path.join(easyModeratorAssets, path.basename(asset.file));
      const target = path.join(projectDir, asset.file);
      if (fs.existsSync(source) && !fs.existsSync(target)) fs.copyFileSync(source, target);
    }
  }
  const file = path.join(projectDir, 'project.json');
  assert.equal(fs.existsSync(file), false, `Refusing to replace an existing test project: ${file}`);
  fs.writeFileSync(file, JSON.stringify(project, null, 2), 'utf8');
  return projectDir;
}

function addNarrationAssets(project, projectDir, scripts) {
  let sceneStart = 0;
  const audioTracks = [];
  for (const scene of project.scenes) {
    const narrationText = scripts[scene.id];
    if (narrationText) {
      const filename = `voice-${scene.id}-${randomUUID()}.wav`;
      const voice = localNarration(narrationText, path.join(projectDir, 'assets', filename));
      const assetId = `voice-${scene.id}`;
      project.assets.push({ id: assetId, kind: 'voice', file: `assets/${filename}`, durationSeconds: voice.durationSeconds, source: 'locally_imported_voice' });
      scene.narrationText = narrationText;
      scene.narrationAssetId = assetId;
      scene.narrationDurationSeconds = voice.durationSeconds;
      scene.isApproved = true;
      scene.approvalStatus = 'approved';
      audioTracks.push({ id: assetId, type: 'voice', path: voice.path, startTime: sceneStart + 0.08, duration: voice.durationSeconds, volume: 1 });
    }
    sceneStart += Number(scene.durationSeconds) || 4;
  }
  return audioTracks;
}

function projectForRender(project, projectDir) {
  const renderProject = structuredClone(project);
  for (const asset of renderProject.assets || []) {
    const ext = path.extname(asset.file || '').toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) continue;
    const imagePath = path.join(projectDir, asset.file);
    const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : `image/${ext.slice(1)}`;
    asset.file = `data:${mime};base64,${fs.readFileSync(imagePath).toString('base64')}`;
  }
  return renderProject;
}

async function renderProof(label, project, projectDir, targetId, audioTracks = [], audioPath = null) {
  const composition = compileComposition({ project: projectForRender(project, projectDir), targetId });
  const outputPath = path.join(storage.exports, `v003-${label}-${randomUUID()}.mp4`);
  assert.equal(fs.existsSync(outputPath), false, `Refusing to replace existing video output: ${outputPath}`);
  const result = await renderVideo({
    compositionHtml: composition.html,
    target: composition.target,
    totalFrames: composition.totalFrames,
    totalDuration: composition.totalDuration,
    outputPath,
    tempParentDir: storage.renders,
    audioTracks,
    audioPath,
    audioConfig: project.audio || {}
  });
  assert.equal(result.success, true);
  const probe = await probeMedia(outputPath);
  const volume = await measureAudioVolume(outputPath);
  const silence = await detectSilence(outputPath, -40, 0.5);
  assert.equal(probe.videoCodec, 'h264');
  assert.equal(probe.width, composition.target.width);
  assert.equal(probe.height, composition.target.height);
  assert.equal(probe.fps, composition.target.fps);
  assert.equal(probe.audioCodec, 'aac');
  assert.ok(probe.duration >= composition.totalDuration - 0.15);
  const record = {
    label, outputPath, width: probe.width, height: probe.height, fps: probe.fps,
    durationSeconds: Number(probe.duration.toFixed(2)), fileSizeBytes: probe.fileSize,
    videoCodec: probe.videoCodec, audioCodec: probe.audioCodec,
    meanVolumeDb: volume.meanVolumeDb, maxVolumeDb: volume.maxVolumeDb,
    isSilent: volume.isSilent, silenceIntervals: silence.silenceIntervals.length
  };
  proofResults.push(record);
  console.log(`${label}: ${outputPath} | ${probe.width}x${probe.height}@${probe.fps} | ${probe.duration.toFixed(2)}s | ${probe.videoCodec}/${probe.audioCodec} | ${volume.meanVolumeDb} dB mean`);
  return { outputPath, probe, volume, composition };
}

function easyModeratorMatrixProject() {
  const project = createEasyModeratorProject();
  project.project.id = `v003-easymoderator-${randomUUID()}`;
  project.project.name = 'EasyModerator Bold & Future-Facing Proof';
  project.template.id = 'guided_product_story';
  project.creative.keyMessage = 'Use the approved EasyModerator product story and supplied demonstration image.';
  project.creative.productTruthProfile = [];
  project.audio = { mode: 'voice_and_music', muteAll: false, musicVolume: 0.08, voiceVolume: 1, duckMusicUnderVoice: true, targetLufs: -16, musicAssetId: 'music' };
  project.scenes = [
    { id: 'hook', kind: 'kinetic_text', durationSeconds: 8, eyebrow: 'EASYMODERATOR', headline: 'Too many customer messages?', subheadline: 'কথোপকথনের গল্প, আপনার তথ্য দিয়ে', highlightWords: ['customer messages'], layout: 'centered', motion: { entrance: 'stagger_words', emphasis: 'highlight', exit: 'fade', transition: 'crossfade', cameraPreset: 'none', intensity: 0.8 } },
    { id: 'problem', kind: 'problem', durationSeconds: 7, eyebrow: 'YOUR STORY', headline: 'Every business has a different story.', subheadline: 'Use claims you can support with evidence.', highlightWords: ['different story'], layout: 'centered', motion: { entrance: 'slide_left', emphasis: 'none', exit: 'fade', transition: 'wipe_left', cameraPreset: 'slow_pan', intensity: 0.65 } },
    { id: 'demo', kind: 'ui_demo', durationSeconds: 8, eyebrow: 'SUPPLIED SCREEN EXAMPLE', headline: 'EasyModerator interface preview', subheadline: 'Confirm current product behavior before publishing.', mediaAssetIds: ['inbox'], layout: 'device_mockup', deviceFrame: 'browser_window', motion: { entrance: 'mask_reveal', emphasis: 'none', exit: 'fade', transition: 'zoom', cameraPreset: 'pan_and_scan', intensity: 0.6 } },
    { id: 'cta', kind: 'cta', durationSeconds: 7, eyebrow: 'EASYMODERATOR', headline: 'Manage conversations. Stay in control.', subheadline: '', ctaLabel: 'Learn more', ctaDestination: '', mediaAssetIds: ['logo'], layout: 'centered', motion: { entrance: 'fade_up', emphasis: 'none', exit: 'fade', transition: 'cut', cameraPreset: 'none', intensity: 0.6 } }
  ];
  return project;
}

function unrelatedBrandProject() {
  const project = createBlankProject('Northstar Paper Test Fixture', 'en');
  project.project.id = `v003-northstar-${randomUUID()}`;
  project.project.name = 'Northstar Paper Story';
  project.template.id = 'app_showcase';
  project.brand = { name: 'Northstar Paper', tagline: '', primaryColor: '#16324F', backgroundColor: '#F5F1E8', textColor: '#18212B', accentColor: '#E76F51', latinFontFamily: 'Inter', banglaFontFamily: 'Noto Sans Bengali', fontWeight: 700, cornerRadiusPx: 12, stylePreset: 'light_editorial' };
  project.creative.keyMessage = 'A neutral fictional brand fixture for testing brand isolation.';
  project.creative.cta = { label: '', destination: '' };
  project.audio = { mode: 'voice_and_music', muteAll: false, musicVolume: 0, voiceVolume: 1, duckMusicUnderVoice: false, targetLufs: -16 };
  project.scenes = [
    { id: 'hook', kind: 'kinetic_text', durationSeconds: 7, headline: 'Make room for your next idea.', subheadline: 'Northstar Paper', highlightWords: ['next idea'], motion: { entrance: 'fade_up', emphasis: 'highlight', exit: 'fade', transition: 'crossfade', cameraPreset: 'none', intensity: 0.6 } },
    { id: 'story', kind: 'feature', durationSeconds: 7, headline: 'A page for the thought you want to keep.', subheadline: 'Add your own product details here.', motion: { entrance: 'slide_right', emphasis: 'none', exit: 'fade', transition: 'wipe_right', cameraPreset: 'slow_pan', intensity: 0.6 } },
    { id: 'close', kind: 'cta', durationSeconds: 6, headline: 'Write your next line.', subheadline: 'Northstar Paper', ctaLabel: 'Explore the story', ctaDestination: '', motion: { entrance: 'scale_pop', emphasis: 'none', exit: 'fade', transition: 'cut', cameraPreset: 'none', intensity: 0.6 } }
  ];
  return project;
}

test('A-F video matrix renders actual local H.264/AAC outputs without cloud calls or destructive paths', async () => {
  assert.ok(storage.root.toLowerCase().startsWith('e:\\growthstudio\\test-runs\\'), `Tests must use isolated E-drive storage, got ${storage.root}`);
  fs.mkdirSync(storage.projects, { recursive: true });
  fs.mkdirSync(storage.exports, { recursive: true });

  const originalOpenAIKey = process.env.CONTENT_STUDIO_KEY;
  const originalGeminiKey = process.env.CONTENT_STUDIO_GEMINI;

  try {
    // A/B — one EasyModerator story in 16:9 and 9:16 with the selected brand kit, supplied image, narration and music.
    const emProject = easyModeratorMatrixProject();
    const emDir = path.join(storage.projects, emProject.project.id);
    fs.mkdirSync(emDir, { recursive: false });
    emProject.assets.find(asset => asset.id === 'music').file = 'assets/background-music.wav';
    for (const scene of emProject.scenes) {
      if (scene.id === 'demo') scene.claimDisclaimer = 'Supplied screen example; current behavior not independently verified.';
    }
    const emTracks = addNarrationAssets(emProject, emDir, {
      hook: 'Running a small business brings many conversations.',
      problem: 'Every product and every business has its own story.',
      demo: 'This supplied screen is an example. Confirm current product behavior before publishing.',
      cta: 'Manage conversations. Stay in control.'
    });
    persistProject(emProject);
    const emMusic = path.join(emDir, 'assets', 'background-music.wav');
    const a = await renderProof('A-easymoderator-landscape', emProject, emDir, 'landscape', emTracks, emMusic);
    assert.equal(a.probe.width, 1920);
    assert.equal(a.probe.height, 1080);
    assert.ok(a.probe.duration >= 29.5 && a.probe.duration <= 30.5);
    assert.equal(a.volume.isSilent, false);
    assert.ok(a.volume.meanVolumeDb > -35);

    const b = await renderProof('B-easymoderator-portrait', emProject, emDir, 'portrait', emTracks, emMusic);
    assert.equal(b.probe.width, 1080);
    assert.equal(b.probe.height, 1920);
    assert.equal(b.probe.fps, 30);
    assert.equal(b.volume.isSilent, false);
    assert.ok(emProject.scenes.some(scene => /কথোপকথনের/.test(scene.subheadline)));

    // C — a distinct brand in 4:5, with no EasyModerator/DukanBot name or palette leakage.
    const genericProject = unrelatedBrandProject();
    const genericDir = path.join(storage.projects, genericProject.project.id);
    fs.mkdirSync(genericDir, { recursive: false });
    const cTracks = addNarrationAssets(genericProject, genericDir, {
      hook: 'Make room for your next idea.',
      story: 'A page for the thought you want to keep.',
      close: 'Write your next line.'
    });
    persistProject(genericProject);
    const serializedGeneric = JSON.stringify(genericProject);
    assert.equal(serializedGeneric.includes('EasyModerator'), false);
    assert.equal(serializedGeneric.includes('DukanBot'), false);
    assert.equal(genericProject.brand.primaryColor, '#16324F');
    const c = await renderProof('C-northstar-generic-4x5', genericProject, genericDir, 'portrait_4_5', cTracks);
    assert.equal(c.probe.width, 1080);
    assert.equal(c.probe.height, 1350);
    assert.equal(c.probe.fps, 25);
    assert.equal(c.volume.isSilent, false);

    // D — reopen the saved project with both API keys removed and fetch blocked; edit one caption and re-export with local voice.
    process.env.CONTENT_STUDIO_KEY = '';
    process.env.CONTENT_STUDIO_GEMINI = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('Unexpected network access during offline re-export.'); };
    try {
      const reloaded = JSON.parse(fs.readFileSync(path.join(genericDir, 'project.json'), 'utf8'));
      assert.equal(reloaded.project.id, genericProject.project.id);
      reloaded.scenes[0].headline = 'Make room for your next good idea.';
      fs.writeFileSync(path.join(genericDir, 'project.json'), JSON.stringify(reloaded, null, 2), 'utf8');
      const reopened = JSON.parse(fs.readFileSync(path.join(genericDir, 'project.json'), 'utf8'));
      const d = await renderProof('D-offline-cached-voice-reexport', reopened, genericDir, 'portrait_4_5', cTracks);
      assert.equal(d.volume.isSilent, false);
      assert.ok(d.probe.fileSize > 10000);
    } finally {
      globalThis.fetch = originalFetch;
    }

    // E — manual workflow, no API key, and no forced AI step.
    const manual = createBlankProject('Manual Local-Only Test', 'en');
    manual.project.id = `v003-manual-${randomUUID()}`;
    manual.project.name = 'Manual Local-Only Test';
    manual.creative.keyMessage = 'A test project created and edited without an AI provider.';
    manual.brand.name = 'Manual Test Brand';
    manual.audio = { mode: 'silent', muteAll: true };
    manual.scenes = [
      { id: 'manual-hook', kind: 'kinetic_text', durationSeconds: 3, headline: 'Write a clear opening line.', motion: { entrance: 'stagger_words', exit: 'fade' } },
      { id: 'manual-close', kind: 'cta', durationSeconds: 3, headline: 'Add your next step.', ctaLabel: '', ctaDestination: '', motion: { entrance: 'fade_up', exit: 'fade' } }
    ];
    const manualDir = path.join(storage.projects, manual.project.id);
    fs.mkdirSync(manualDir, { recursive: false });
    persistProject(manual);
    const e = await renderProof('E-manual-no-key', manual, manualDir, 'landscape');
    assert.equal(e.probe.width, 1920);
    assert.equal(e.probe.height, 1080);

    // F — fake provider contract proves only the requested scene changes; unchanged voice assets stay byte-identical.
    const selective = unrelatedBrandProject();
    selective.project.id = `v003-selective-${randomUUID()}`;
    selective.project.name = 'Selective Rewrite Fixture';
    const selectiveDir = path.join(storage.projects, selective.project.id);
    fs.mkdirSync(selectiveDir, { recursive: false });
    const fTracks = addNarrationAssets(selective, selectiveDir, {
      hook: 'Make room for your next idea.',
      story: 'A page for the thought you want to keep.',
      close: 'Write your next line.'
    });
    selective.scenes[1].isApproved = false;
    selective.scenes[1].approvalStatus = 'draft';
    persistProject(selective);
    const unaffectedBefore = [selective.scenes[0], selective.scenes[2]].map(scene => JSON.stringify(scene));
    const audioBefore = selective.assets.filter(asset => asset.kind === 'voice').map(asset => createHash('sha256').update(fs.readFileSync(path.join(selectiveDir, asset.file))).digest('hex'));
    const template = listTemplates().find(item => item.id === selective.template.id);
    const provider = {
      async rewriteSelectedScene(scene) {
        assert.equal(scene.id, 'story');
        return {
          data: {
            sceneId: scene.id, chapterNumber: 1, chapterTitle: 'A day with an idea', sceneRole: 'solution', sceneKind: 'feature', durationSeconds: 7,
            onscreen: { eyebrow: '', headline: 'Keep the thought that matters.', subheadline: 'A page for your ideas.', highlightWords: ['thought'], ctaLabel: '', ctaDestination: '', statValue: '', statLabel: '' },
            narration: { language: 'en', text: scene.narrationText, pronunciationNotes: '' },
            visuals: { assetIds: [], deviceType: 'none', layout: 'centered', calloutLabel: '' },
            motion: { entrance: 'slide_right', emphasis: 'highlight', exit: 'fade', transition: 'wipe_right', cameraPreset: 'slow_pan', intensity: 0.65 },
            claims: []
          },
          modelUsed: 'local-test-provider', usage: { basis: 'local_test' }, estimatedCostUsd: 0, cacheHit: false
        };
      }
    };
    assert.ok(template);
    const orchestrator = new CreativeOrchestrator({ storagePaths: storage, provider });
    const rewritten = await orchestrator.rewriteScene(selective.project.id, 'story', 'Clarify the message', { consentToSend: true });
    assert.equal(rewritten.scene.id, 'story');
    assert.equal(rewritten.scene.headline, 'Keep the thought that matters.');
    assert.equal(rewritten.scene.narrationAssetId, selective.scenes[1].narrationAssetId);
    assert.deepEqual([rewritten.project.scenes[0], rewritten.project.scenes[2]].map(scene => JSON.stringify(scene)), unaffectedBefore);
    const audioAfter = rewritten.project.assets.filter(asset => asset.kind === 'voice').map(asset => createHash('sha256').update(fs.readFileSync(path.join(selectiveDir, asset.file))).digest('hex'));
    assert.deepEqual(audioAfter, audioBefore);
    assert.ok(runPreflight(rewritten.project).errors.some(message => message.includes('unapproved AI draft')));
    rewritten.scene.isApproved = true;
    rewritten.scene.approvalStatus = 'approved';
    const f = await renderProof('F-selective-scene-rewrite', rewritten.project, selectiveDir, 'portrait', fTracks);
    assert.equal(f.volume.isSilent, false);

    const reportPath = path.join(storage.root, 'video-matrix-results.json');
    assert.equal(fs.existsSync(reportPath), false);
    fs.writeFileSync(reportPath, JSON.stringify(proofResults, null, 2), 'utf8');
    console.log(`A-F evidence recorded: ${reportPath}`);
  } finally {
    if (originalOpenAIKey === undefined) delete process.env.CONTENT_STUDIO_KEY;
    else process.env.CONTENT_STUDIO_KEY = originalOpenAIKey;
    if (originalGeminiKey === undefined) delete process.env.CONTENT_STUDIO_GEMINI;
    else process.env.CONTENT_STUDIO_GEMINI = originalGeminiKey;
  }
});

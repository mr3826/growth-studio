import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { buildServer } from '../apps/local-server/src/index.js';
import { resolveStoragePaths } from '../packages/contracts/src/index.js';
import { getTemplate, runPreflight } from '../packages/template-engine/src/index.js';
import { probeMedia, measureAudioVolume } from '../packages/render-adapter/src/index.js';

const storage = resolveStoragePaths();
const projectIdSuffix = randomUUID();
const TEST_PRODUCT = {
  brandName: 'Growth Studio',
  category: 'local promotional video production software',
  audience: 'Creators who need an editable promotional story for a software product or service',
  problem: 'Product facts and visual assets need to be shaped into a coherent, editable video story.',
  keyMessage: 'Growth Studio uses three installed video templates and renders exports locally with Chromium and FFmpeg.',
  benefits: ['Keep scene copy and motion editable.', 'Preview and render video on the local machine.'],
  language: 'mixed',
  targetDuration: 30,
  communicationGoal: 'awareness',
  funnelStage: 'consideration',
  ctaLabel: 'Learn more',
  ctaDestination: '',
  prohibitedTopics: ['customer metrics', 'testimonials', 'sales results', 'guarantees'],
  productTruthProfile: [
    { id: 'truth-templates', category: 'feature', statement: 'The application includes three installed video templates.', verificationStatus: 'verified_live', isApproved: true, evidence: 'Verified against the three installed template manifests.' },
    { id: 'truth-local-render', category: 'feature', statement: 'Video export is rendered locally with Chromium and FFmpeg.', verificationStatus: 'verified_live', isApproved: true, evidence: 'Verified against the local render adapter and FFmpeg pipeline.' },
    { id: 'truth-editable-scenes', category: 'feature', statement: 'Project scenes store editable copy, duration, media references, and supported motion settings.', verificationStatus: 'verified_live', isApproved: true, evidence: 'Verified against the local project contract and storyboard editor.' }
  ]
};

let server;
let liveOutputPath = null;
after(async () => { if (server) await server.close(); });

function createLocalVoice(text, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  assert.equal(fs.existsSync(outputPath), false, `Refusing to overwrite test narration: ${outputPath}`);
  execFileSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
    path.resolve('tests/helpers/create-local-narration.ps1'), '-OutputPath', outputPath, '-Text', text
  ], { stdio: 'pipe', windowsHide: true, maxBuffer: 1024 * 1024 });
  const bytes = fs.readFileSync(outputPath);
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
  const durationSeconds = (bytes.length - 44) / (24000 * 2);
  return durationSeconds;
}

function providerUnavailable(response) {
  return ['configuration_missing', 'provider_auth', 'provider_billing', 'provider_rate_limited', 'provider_timeout', 'provider_unavailable', 'provider_model_unavailable'].includes(response?.code);
}

test('one explicitly opted-in live Responses API flow yields three concepts, editable scenes, and a playable local MP4', async t => {
  if (process.env.LIVE_OPENAI_TEST !== '1') {
    console.log('OPENAI_LIVE=BLOCKED reason=Set LIVE_OPENAI_TEST=1 to authorize the bounded live proof run.');
    t.skip('Live OpenAI verification was not explicitly enabled.');
    return;
  }
  if (!process.env.CONTENT_STUDIO_KEY?.trim()) {
    console.log('OPENAI_LIVE=BLOCKED reason=CONTENT_STUDIO_KEY is not configured in the test process.');
    t.skip('No OpenAI credential is configured.');
    return;
  }
  if (!Number(process.env.PORT) || !storage.root.toLowerCase().startsWith('e:\\growthstudio\\test-runs\\')) {
    throw new Error('Run this proof through scripts/run-tests.js so project files and exports use an isolated E-drive directory.');
  }

  server = await buildServer();
  await server.listen({ port: Number(process.env.PORT), host: '127.0.0.1' });
  const status = (await server.inject({ method: 'GET', url: '/api/creative/provider-status' })).json();
  assert.equal(status.configured, true);
  assert.equal(status.connectivity, 'not_checked', 'Status check must not silently make a model availability call.');
  assert.equal(Object.hasOwn(status, 'apiKey'), false);

  const projectName = `Growth Studio live proof ${projectIdSuffix.slice(0, 8)}`;
  const created = await server.inject({ method: 'POST', url: '/api/projects', payload: { preset: 'blank', name: projectName, language: 'mixed' } });
  assert.equal(created.statusCode, 201);
  const initialProject = created.json();
  const projectId = initialProject.project.id;
  initialProject.project.name = projectName;
  initialProject.project.clientOrProduct = 'Growth Studio';
  initialProject.template.id = 'guided_product_story';
  initialProject.brand.name = 'Growth Studio';
  initialProject.creative.keyMessage = TEST_PRODUCT.keyMessage;
  initialProject.creative.cta = { label: TEST_PRODUCT.ctaLabel, destination: '' };
  const savedInitial = await server.inject({ method: 'PUT', url: `/api/projects/${projectId}`, payload: initialProject });
  assert.equal(savedInitial.statusCode, 200);

  const briefResponse = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/creative/concepts`,
    payload: { brief: TEST_PRODUCT, model: 'gpt-6.1-sol', consentToSend: true }
  });
  if (briefResponse.statusCode !== 200) {
    const safeError = briefResponse.json();
    if (providerUnavailable(safeError)) {
      console.log(`OPENAI_LIVE=BLOCKED reason=${safeError.code} message=${safeError.error}`);
      t.skip(`OpenAI provider unavailable: ${safeError.code}`);
      return;
    }
    assert.fail(`Concept request failed: HTTP ${briefResponse.statusCode}, code=${safeError.code || 'unknown'}`);
  }
  const conceptsResult = briefResponse.json();
  const concepts = conceptsResult.concepts;
  assert.equal(concepts.length, 3);
  assert.equal(new Set(concepts.map(concept => concept.angleType)).size, 3);
  assert.equal(new Set(concepts.map(concept => concept.hookText.trim().toLocaleLowerCase())).size, 3);
  console.log(`OpenAI concept call: model=${conceptsResult.modelUsed}, status=200, usage=${JSON.stringify(conceptsResult.usage)}, estimatedCostUsd=${conceptsResult.estimatedCostUsd}, cacheHit=${conceptsResult.cacheHit}`);
  concepts.forEach((concept, index) => console.log(`Concept ${index + 1}: ${concept.angleTitle} [${concept.angleType}] — ${concept.hookText}`));

  const selectedConcept = concepts[0];
  const storyboardResponse = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/creative/storyboard`,
    payload: { conceptId: selectedConcept.id, model: 'gpt-6.1-sol', consentToSend: true, replaceScenesConfirmed: true }
  });
  if (storyboardResponse.statusCode !== 200) {
    const safeError = storyboardResponse.json();
    if (providerUnavailable(safeError)) {
      console.log(`OPENAI_LIVE=BLOCKED reason=${safeError.code} message=${safeError.error}`);
      t.skip(`OpenAI storyboard request unavailable: ${safeError.code}`);
      return;
    }
    assert.fail(`Storyboard request failed: HTTP ${storyboardResponse.statusCode}, code=${safeError.code || 'unknown'}`);
  }

  const storyboardResult = storyboardResponse.json();
  const project = storyboardResult.project;
  const template = getTemplate(project.template.id);
  assert.ok(template);
  assert.ok(project.scenes.length >= 3 && project.scenes.length <= 12);
  assert.ok(project.scenes.every(scene => scene.provenance?.generatedBy === 'openai'));
  assert.ok(project.scenes.every(scene => !scene.isApproved && scene.approvalStatus === 'draft'));
  assert.ok(project.scenes.every(scene => template.sceneKinds.includes(scene.kind)));
  assert.ok(project.scenes.every(scene => (scene.mediaAssetIds || []).every(id => project.assets.some(asset => asset.id === id))));
  assert.equal(new Set(project.scenes.map(scene => scene.id)).size, project.scenes.length);
  console.log(`OpenAI storyboard call: model=${storyboardResult.modelUsed}, status=200, usage=${JSON.stringify(storyboardResult.usage)}, estimatedCostUsd=${storyboardResult.estimatedCostUsd}, cacheHit=${storyboardResult.cacheHit}`);
  project.scenes.forEach(scene => console.log(`Draft scene ${scene.id} [${scene.kind}/${scene.motion?.entrance}/${scene.motion?.transition}]: ${scene.headline} | narration: ${scene.narrationText}`));

  // Simulate the explicit review and approval action on a bounded, non-sensitive QA fixture.
  // Claims must reference the exact pre-approved evidence set; unsupported metrics/absolutes block the render.
  const truthById = new Map(TEST_PRODUCT.productTruthProfile.map(item => [item.id, item]));
  for (const scene of project.scenes) {
    for (const claim of scene.claims || []) {
      const truth = truthById.get(claim.evidenceId);
      assert.ok(truth?.isApproved && truth.verificationStatus === claim.status, `Unapproved claim evidence in scene ${scene.id}.`);
      assert.equal(claim.claimText.trim().length > 0, true);
    }
  }

  const projectDir = path.join(storage.projects, projectId);
  const assetsDir = path.join(projectDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  for (const scene of project.scenes) {
    const originalNarration = scene.narrationText.trim();
    assert.ok(originalNarration.length > 0, `OpenAI scene ${scene.id} needs a narration draft.`);
    const voiceFilename = `voice-${scene.id}.wav`;
    const voicePath = path.join(assetsDir, voiceFilename);
    const voiceDuration = createLocalVoice(originalNarration, voicePath);
    scene.narrationAssetId = `voice-${scene.id}`;
    scene.narrationDurationSeconds = voiceDuration;
    scene.durationSeconds = Math.max(scene.durationSeconds, Math.ceil(voiceDuration + 0.5));
    scene.isApproved = true;
    scene.approvalStatus = 'approved';
    project.assets.push({ id: scene.narrationAssetId, kind: 'voice', file: `assets/${voiceFilename}`, durationSeconds: voiceDuration, source: 'locally_imported_voice' });
  }
  project.audio = { mode: 'generated_voice', muteAll: false, musicVolume: 0, voiceoverVolume: 1, duckMusicUnderVoice: false, targetLufs: -16 };
  const updated = await server.inject({ method: 'PUT', url: `/api/projects/${projectId}`, payload: project });
  assert.equal(updated.statusCode, 200, `Approved live storyboard did not satisfy the project contract: ${updated.body.slice(0, 600)}`);

  // The generated scenes are now persisted, reopenable drafts with locally imported narration.
  const reopened = (await server.inject({ method: 'GET', url: `/api/projects/${projectId}` })).json();
  assert.equal(reopened.scenes.length, project.scenes.length);
  assert.ok(reopened.scenes.every(scene => scene.isApproved && scene.narrationAssetId));
  const preflight = await server.inject({ method: 'POST', url: `/api/projects/${projectId}/preflight`, payload: { targetId: 'landscape' } });
  assert.equal(preflight.statusCode, 200);
  if (!preflight.json().passed) {
    assert.fail(`Reviewed OpenAI storyboard did not pass local preflight: ${preflight.json().errors.join('; ')}`);
  }

  const projectUsage = (await server.inject({ method: 'GET', url: `/api/projects/${projectId}/creative/usage` })).json();
  assert.ok(projectUsage.totalCalls >= 2);
  assert.ok(projectUsage.totalSpentUsd < projectUsage.budgetCapUsd);
  assert.ok(projectUsage.receipts.every(receipt => receipt.model === 'gpt-6.1-sol'));
  console.log(`OpenAI usage receipts: calls=${projectUsage.totalCalls}, tokens=${projectUsage.totalTokens}, estimated/reported USD=${projectUsage.totalSpentUsd.toFixed(6)}, cap=${projectUsage.budgetCapUsd.toFixed(2)}`);

  const renderResponse = await server.inject({ method: 'POST', url: `/api/projects/${projectId}/renders`, payload: { targetId: 'landscape' } });
  assert.equal(renderResponse.statusCode, 202);
  const { jobId } = renderResponse.json();
  let job;
  const deadline = Date.now() + 8 * 60 * 1000;
  do {
    await new Promise(resolve => setTimeout(resolve, 1000));
    job = (await server.inject({ method: 'GET', url: `/api/renders/${jobId}` })).json();
    if (job.status === 'failed' || job.status === 'cancelled') assert.fail(`Local render ${job.status}: ${job.error || 'no details'}`);
  } while (job.status !== 'done' && Date.now() < deadline);
  assert.equal(job.status, 'done', 'Local MP4 render exceeded its bounded test timeout.');
  liveOutputPath = job.outputPath;
  const probe = await probeMedia(job.outputPath);
  const volume = await measureAudioVolume(job.outputPath);
  assert.equal(probe.width, 1920);
  assert.equal(probe.height, 1080);
  assert.equal(probe.fps, 30);
  assert.equal(probe.videoCodec, 'h264');
  assert.equal(probe.audioCodec, 'aac');
  assert.equal(volume.isSilent, false);
  assert.ok(volume.meanVolumeDb > -40);
  console.log(`OPENAI_LIVE=PASS model=${storyboardResult.modelUsed} concepts=3 editableScenes=${project.scenes.length}`);
  console.log(`OPENAI_MPV=${job.outputPath} ${probe.width}x${probe.height}@${probe.fps} ${probe.duration.toFixed(2)}s ${probe.videoCodec}/${probe.audioCodec} mean=${volume.meanVolumeDb}dB`);
  assert.ok(liveOutputPath);
});

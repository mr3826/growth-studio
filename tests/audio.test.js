import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { buildServer } from '../apps/local-server/src/index.js';
import { measureAudioVolume, detectSilence, synthesizeSpeechGemini } from '../packages/render-adapter/src/index.js';

async function runAudioTests() {
  console.log('--- Testing Audio & TTS Narration Pipeline ---');

  const server = await buildServer();
  await server.ready();

  // Test 1: Provider Status
  console.log('[1/5] Checking GET /api/narration/provider-status...');
  const statusRes = await server.inject({
    method: 'GET',
    url: '/api/narration/provider-status'
  });
  assert.equal(statusRes.statusCode, 200);
  const statusData = JSON.parse(statusRes.payload);
  assert.equal(statusData.provider, 'gemini');
  assert.ok(Array.isArray(statusData.voices));
  assert.ok(statusData.voices.length >= 3);
  console.log(`✓ TTS provider status OK: available=${statusData.available}, voices=${statusData.voices.length}`);

  // Test 2: Preview TTS endpoint
  console.log('\n[2/5] Testing POST /api/narration/preview with short text...');
  const previewRes = await server.inject({
    method: 'POST',
    url: '/api/narration/preview',
    payload: {
      text: 'Growth Studio audio test',
      voice: 'Puck'
    }
  });
  assert.equal(previewRes.statusCode, 200);
  assert.equal(previewRes.headers['content-type'], 'audio/wav');
  const previewBuffer = previewRes.rawPayload;
  assert.ok(previewBuffer.length > 1000);
  assert.equal(previewBuffer.subarray(0, 4).toString(), 'RIFF');
  assert.equal(previewBuffer.subarray(8, 12).toString(), 'WAVE');
  console.log(`✓ TTS preview returned valid WAV (${previewBuffer.length} bytes)`);

  // Test 3: Create project and generate narration for scene
  console.log('\n[3/5] Testing POST /api/projects/:id/narration/generate...');
  const projRes = await server.inject({
    method: 'POST',
    url: '/api/projects',
    payload: { starterId: 'guided_bangla' }
  });
  assert.equal(projRes.statusCode, 201);
  const project = JSON.parse(projRes.payload);
  const projectId = project.project?.id || project.id;

  const scene0 = project.scenes[0];
  scene0.narrationText = 'সহজ মডারেশন দিয়ে আপনার পেইজ ম্যানেজ করুন স্বয়ংক্রিয়ভাবে।';

  await server.inject({
    method: 'PUT',
    url: `/api/projects/${projectId}`,
    payload: project
  });

  const genRes = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/narration/generate`,
    payload: {
      sceneId: scene0.id,
      voice: 'Puck',
      fitDuration: true
    }
  });
  assert.equal(genRes.statusCode, 200);
  const genData = JSON.parse(genRes.payload);
  assert.ok(genData.success);
  assert.ok(genData.generated.length > 0);

  const updatedScene = genData.project.scenes.find(s => s.id === scene0.id);
  assert.ok(updatedScene.narrationAssetId, 'narrationAssetId should be set');
  assert.ok(updatedScene.narrationDurationSeconds > 0, 'narrationDurationSeconds should be > 0');
  console.log(`✓ Narration generated for scene 0: ${updatedScene.narrationDurationSeconds}s, scene adjusted to ${updatedScene.durationSeconds}s`);

  // Verify asset file on disk
  const asset = genData.project.assets.find(a => a.id === updatedScene.narrationAssetId);
  assert.ok(asset, 'Asset entry must exist');
  assert.equal(asset.kind, 'voice');

  // Test 4: Audio volume & silence verification of generated asset
  console.log('\n[4/5] Testing acoustic volume metrics on generated WAV...');
  // Find project on disk via server storage
  const storageRoot = (await server.inject({ method: 'GET', url: '/api/health' })).json().storage.root;
  const wavPath = path.join(storageRoot, 'projects', projectId, asset.file);
  assert.ok(fs.existsSync(wavPath), `WAV file must exist at ${wavPath}`);

  const volMetrics = await measureAudioVolume(wavPath);
  console.log(`   Mean volume: ${volMetrics.meanVolumeDb} dB, Max: ${volMetrics.maxVolumeDb} dB, isSilent: ${volMetrics.isSilent}`);
  assert.ok(!volMetrics.isSilent, 'Generated narration must NOT be silent');
  assert.ok(volMetrics.meanVolumeDb > -40, `Mean volume should be audible (> -40 dB), got ${volMetrics.meanVolumeDb} dB`);

  const silenceMetrics = await detectSilence(wavPath, -40, 1.0);
  console.log(`   Silence intervals (> 1.0s): ${silenceMetrics.silenceIntervals.length}`);

  // Test 5: Fit-scenes endpoint
  console.log('\n[5/5] Testing POST /api/projects/:id/audio/fit-scenes...');
  const fitRes = await server.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/audio/fit-scenes`,
    payload: { paddingSeconds: 1.0 }
  });
  assert.equal(fitRes.statusCode, 200);
  const fitData = JSON.parse(fitRes.payload);
  const fitScene = fitData.scenes.find(s => s.id === scene0.id);
  assert.ok(fitScene.durationSeconds >= updatedScene.narrationDurationSeconds + 0.9);
  console.log(`✓ fit-scenes adjusted scene duration to ${fitScene.durationSeconds}s`);

  // Test 6: Offline Cache Hit without API Key (Regression Test)
  console.log('\n[6/6] Testing synthesizeSpeechGemini offline cache hit (process.env.CONTENT_STUDIO_GEMINI = "")...');
  const originalKey = process.env.CONTENT_STUDIO_GEMINI;
  process.env.CONTENT_STUDIO_GEMINI = '';
  try {
    const offlineResult = await synthesizeSpeechGemini({
      text: scene0.narrationText,
      voice: 'Puck',
      model: 'gemini-2.5-flash-preview-tts',
      cacheDir: path.join(storageRoot, 'renders', 'tts_cache')
    });
    assert.equal(offlineResult.fromCache, true);
    assert.ok(offlineResult.wavBuffer.length > 1000);
    console.log(`✓ Offline cache hit succeeded without API key (${offlineResult.wavBuffer.length} bytes, duration: ${offlineResult.durationSeconds.toFixed(2)}s)`);
  } finally {
    process.env.CONTENT_STUDIO_GEMINI = originalKey;
  }

  // Clean up test project
  await server.inject({
    method: 'DELETE',
    url: `/api/projects/${projectId}`
  });

  await server.close();
  console.log('\n>>> ALL AUDIO & NARRATION PIPELINE TESTS PASSED! <<<');
}

runAudioTests().catch(err => {
  console.error('Audio test failed:', err);
  process.exit(1);
});

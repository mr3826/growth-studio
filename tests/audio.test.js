import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto, { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { buildServer } from '../apps/local-server/src/index.js';
import { measureAudioVolume, detectSilence, synthesizeSpeechGemini, GEMINI_TTS_MODEL } from '../packages/render-adapter/src/index.js';
import { resolveStoragePaths } from '../packages/contracts/src/index.js';

const storage = resolveStoragePaths();
const MODEL = GEMINI_TTS_MODEL;
const VOICE = 'Puck';
let server;
after(async () => { if (server) await server.close(); });

function createOfflineVoiceFixture(text, name) {
  const outputPath = path.join(storage.renders, `${name}-${randomUUID()}.wav`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  execFileSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
    path.resolve('tests/helpers/create-local-narration.ps1'),
    '-OutputPath', outputPath, '-Text', text
  ], { stdio: 'pipe', windowsHide: true, maxBuffer: 1024 * 1024 });
  const wav = fs.readFileSync(outputPath);
  assert.equal(wav.subarray(0, 4).toString(), 'RIFF');
  assert.equal(wav.subarray(8, 12).toString(), 'WAVE');
  return { outputPath, wav };
}

test('approved narration reuses a local cached WAV with no Gemini request', async () => {
  server = await buildServer();
  const previousKey = process.env.CONTENT_STUDIO_GEMINI;
  const previousFetch = globalThis.fetch;
  const script = `Offline audio regression fixture ${randomUUID().slice(0, 8)}.`;
  const { wav } = createOfflineVoiceFixture(script, 'offline-approved-narration');
  const cacheDir = path.join(storage.renders, 'tts_cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const cacheName = `tts_${crypto.createHash('sha256').update(`${MODEL}\u0000${VOICE}\u0000${script}`).digest('hex')}.wav`;
  const cacheFile = path.join(cacheDir, cacheName);
  assert.equal(fs.existsSync(cacheFile), false, 'Unique test narration must not replace an existing cache item.');
  fs.writeFileSync(cacheFile, wav);
  process.env.CONTENT_STUDIO_GEMINI = '';
  globalThis.fetch = async () => { throw new Error('Unexpected outbound request in offline narration regression.'); };

  let projectId;
  try {
    const providerStatus = await server.inject({ method: 'GET', url: '/api/narration/provider-status' });
    assert.equal(providerStatus.statusCode, 200);
    assert.equal(providerStatus.json().available, false);
    assert.equal(providerStatus.json().model, MODEL);

    const created = await server.inject({ method: 'POST', url: '/api/projects', payload: { name: `Offline Audio ${randomUUID()}`, preset: 'blank' } });
    assert.equal(created.statusCode, 201);
    const project = created.json();
    projectId = project.project.id;
    project.creative.cta.label = 'Read more';
    const scene = project.scenes[0];
    scene.narrationText = script;
    scene.durationSeconds = 2;
    scene.isApproved = true;
    scene.approvalStatus = 'approved';
    project.audio.mode = 'generated_voice';
    project.audio.muteAll = false;
    const saved = await server.inject({ method: 'PUT', url: `/api/projects/${projectId}`, payload: project });
    assert.equal(saved.statusCode, 200, saved.body);

    const rawTextRejected = await server.inject({
      method: 'POST', url: '/api/narration/preview', payload: { text: script, voice: VOICE }
    });
    assert.equal(rawTextRejected.statusCode, 400);

    const preview = await server.inject({
      method: 'POST', url: '/api/narration/preview',
      payload: { projectId, sceneId: scene.id, voice: VOICE, consentToSend: true }
    });
    assert.equal(preview.statusCode, 200);
    assert.equal(preview.headers['content-type'], 'audio/wav');
    assert.equal(preview.rawPayload.subarray(0, 4).toString(), 'RIFF');

    const generated = await server.inject({
      method: 'POST', url: `/api/projects/${projectId}/narration/generate`,
      payload: { sceneId: scene.id, voice: VOICE, fitDuration: true, consentToSend: true }
    });
    assert.equal(generated.statusCode, 200);
    const result = generated.json();
    const updatedScene = result.project.scenes.find(item => item.id === scene.id);
    assert.equal(updatedScene.narrationText, script);
    assert.ok(updatedScene.narrationAssetId);
    assert.ok(updatedScene.durationSeconds >= updatedScene.narrationDurationSeconds + 0.49);
    const asset = result.project.assets.find(item => item.id === updatedScene.narrationAssetId);
    assert.equal(asset.source, 'gemini_tts');
    const assetPath = path.join(storage.projects, projectId, asset.file);
    assert.equal(fs.readFileSync(assetPath).subarray(0, 4).toString(), 'RIFF');

    const volume = await measureAudioVolume(assetPath);
    assert.equal(volume.isSilent, false);
    assert.ok(volume.meanVolumeDb > -40, `Imported local voice should be audible; got ${volume.meanVolumeDb} dB.`);
    const silence = await detectSilence(assetPath, -40, 0.5);
    assert.ok(Array.isArray(silence.silenceIntervals));

    const fitted = await server.inject({
      method: 'POST', url: `/api/projects/${projectId}/audio/fit-scenes`, payload: { paddingSeconds: 1 }
    });
    assert.equal(fitted.statusCode, 200);
    const fittedScene = fitted.json().scenes.find(item => item.id === scene.id);
    assert.ok(fittedScene.durationSeconds >= updatedScene.narrationDurationSeconds + 0.99);

    const directCache = await synthesizeSpeechGemini({ text: script, voice: VOICE, model: MODEL, cacheDir });
    assert.equal(directCache.fromCache, true);
    assert.ok(directCache.wavBuffer.length > 1000);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.CONTENT_STUDIO_GEMINI;
    else process.env.CONTENT_STUDIO_GEMINI = previousKey;
    if (projectId) await server.inject({ method: 'DELETE', url: `/api/projects/${projectId}` });
  }
});

test('Gemini 3.8 REST request keeps its key in a header and returns the model WAV unchanged', async () => {
  const previousKey = process.env.CONTENT_STUDIO_GEMINI;
  const previousFetch = globalThis.fetch;
  const script = `Gemini REST contract fixture ${randomUUID().slice(0, 8)}.`;
  const { wav } = createOfflineVoiceFixture(script, 'gemini-rest-contract');
  const fakeSecret = `test-key-${randomUUID()}`;
  let capturedRequest;
  let requestCount = 0;

  process.env.CONTENT_STUDIO_GEMINI = fakeSecret;
  globalThis.fetch = async (url, init) => {
    requestCount += 1;
    capturedRequest = { url: String(url), init, payload: JSON.parse(init.body) };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'ignored metadata' }, {
          inlineData: { mimeType: 'audio/wav', data: wav.toString('base64') }
        }] } }]
      })
    };
  };

  try {
    await assert.rejects(
      synthesizeSpeechGemini({ text: script, voice: 'UnsupportedVoice', cacheDir: null }),
      /Gemini TTS voice is not supported/
    );
    assert.equal(requestCount, 0, 'Unsupported voice IDs must not reach the provider.');
    const result = await synthesizeSpeechGemini({ text: script, voice: VOICE, cacheDir: null });
    const payload = capturedRequest.payload;
    const headers = new Headers(capturedRequest.init.headers);
    const part = payload.contents[0].parts[0];

    assert.equal(capturedRequest.url, `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`);
    assert.equal(headers.get('x-goog-api-key'), fakeSecret);
    assert.equal(capturedRequest.url.includes(fakeSecret), false);
    assert.equal(payload.contents[0].role, 'user');
    assert.equal(part.text, script);
    assert.deepEqual(payload.generationConfig.responseModalities, ['AUDIO']);
    assert.equal(payload.generationConfig.speechConfig.voiceConfig.voice, VOICE);
    assert.equal('prebuiltVoiceConfig' in payload.generationConfig.speechConfig.voiceConfig, false);
    assert.equal(requestCount, 1, 'A single approved synthesis fixture should create one provider request.');
    assert.equal(result.wavBuffer.subarray(0, 4).toString(), 'RIFF');
    assert.deepEqual(result.wavBuffer, wav, 'The provider WAV must not be wrapped in a second RIFF header.');
    assert.ok(result.durationSeconds > 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.CONTENT_STUDIO_GEMINI;
    else process.env.CONTENT_STUDIO_GEMINI = previousKey;
  }
});

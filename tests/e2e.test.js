import assert from 'node:assert/strict';
import { probeMedia } from '../packages/render-adapter/src/index.js';
import { buildServer } from '../apps/local-server/src/index.js';
import fs from 'node:fs';

const BASE_URL = 'http://127.0.0.1:4317';

async function runE2ETests() {
  console.log('====================================================');
  console.log('   GROWTH STUDIO V0.01 — E2E VERIFICATION SUITE    ');
  console.log('====================================================');

  let serverInstance = null;
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (!healthCheck.ok) throw new Error('Server not ready');
  } catch (_) {
    console.log('-> Starting local Fastify server at http://127.0.0.1:4317...');
    serverInstance = await buildServer();
    await serverInstance.listen({ port: 4317, host: '127.0.0.1' });
    console.log('✓ Fastify server booted successfully for E2E suite.');
  }

  try {
    // Test 1: Health check
    console.log('\n[1/8] Testing Server Health & Readiness...');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, 'ok');
    assert.equal(health.chrome.available, true);
    console.log('✓ Local server running on 127.0.0.1:4317');
    console.log(`✓ Headless Chrome verified at: ${health.chrome.path}`);
    console.log(`✓ Storage Volume: ${health.storage.root} (${health.storage.freeGB} GB free)`);

    // Test 2: Create Generic Reference-Aligned Guided Story Starter Project
    console.log('\n[2/8] Creating Generic Starter Project (guided_bangla)...');
    const createRes = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: 'guided_bangla' })
    });
    assert.equal(createRes.status, 201);
    const project = await createRes.json();
    const projectId = project.project.id;
    assert.ok(projectId);
    console.log(`✓ Guided Story starter project created with ID: '${projectId}'`);
    console.log(`✓ Project contains ${project.scenes.length} scenes and ${project.assets.length} assets`);

    // Test 3: Edit Project Content & Animation Settings
    console.log('\n[3/8] Modifying Video Content, Branding & Scene Motion...');
    project.project.name = 'DukanBot Verified Story V0.01';
    project.creative.keyMessage = 'সব কাস্টমার মেসেজ এক স্বয়ংক্রিয় ইনবক্সে ২৪/৭';
    project.brand.primaryColor = '#18181B';
    project.brand.accentColor = '#CCFF00';
    project.scenes[0].headline = 'হাজারো কাস্টমার মেসেজ সামলাতে হিমশিম খাচ্ছেন?';
    project.scenes[0].subheadline = 'দেরিতে রিপ্লাই মানেই সরাসরি কাস্টমার হারিয়ে যাওয়া।';
    project.scenes[0].highlightWords = ['হিমশিম', 'মেসেজ'];
    project.scenes[0].motion = {
      entrance: 'stagger_words',
      exit: 'fade',
      easing: 'spring',
      staggerMilliseconds: 70
    };

    const saveRes = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    });
    assert.equal(saveRes.status, 200);
    console.log('✓ Project edits validated against JSON Schema and saved to disk');

    // Test 4: Reload Project and verify persistence
    console.log('\n[4/8] Verifying Project Persistence (Reload from disk)...');
    const reloadRes = await fetch(`${BASE_URL}/api/projects/${projectId}`);
    assert.equal(reloadRes.status, 200);
    const reloaded = await reloadRes.json();
    assert.equal(reloaded.project.name, 'DukanBot Verified Story V0.01');
    assert.equal(reloaded.scenes[0].headline, 'হাজারো কাস্টমার মেসেজ সামলাতে হিমশিম খাচ্ছেন?');
    console.log('✓ Saved edits accurately recovered from project.json');

    // Test 5: Verify Preview Generation (Portrait, Landscape, and 4:5 Reference)
    console.log('\n[5/8] Testing Preview Compositions (4:5, 9:16, 16:9)...');
    const preview45Res = await fetch(`${BASE_URL}/api/projects/${projectId}/preview-html?target=portrait_4_5`);
    assert.equal(preview45Res.status, 200);
    const html45 = await preview45Res.text();
    assert.ok(html45.includes('width=1080'));
    assert.ok(html45.includes('height=1350'));
    assert.ok(html45.includes('হিমশিম'));

    const previewPortraitRes = await fetch(`${BASE_URL}/api/projects/${projectId}/preview-html?target=portrait`);
    assert.equal(previewPortraitRes.status, 200);
    const htmlPortrait = await previewPortraitRes.text();
    assert.ok(htmlPortrait.includes('width=1080'));
    assert.ok(htmlPortrait.includes('height=1920'));

    const previewLandscapeRes = await fetch(`${BASE_URL}/api/projects/${projectId}/preview-html?target=landscape`);
    assert.equal(previewLandscapeRes.status, 200);
    const htmlLandscape = await previewLandscapeRes.text();
    assert.ok(htmlLandscape.includes('width=1920'));
    assert.ok(htmlLandscape.includes('height=1080'));
    console.log('✓ All 3 preview targets (4:5, 9:16, 16:9) generated and verified cleanly');

    // Test 6: Export Portrait MP4 (1080x1920 @ 30 FPS)
    console.log('\n[6/8] Exporting & Probing Portrait MP4 (1080x1920 @ 30 FPS)...');
    const renderPortraitRes = await fetch(`${BASE_URL}/api/projects/${projectId}/renders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: 'portrait' })
    });
    assert.equal(renderPortraitRes.status, 202);
    const { jobId: jobPortraitId } = await renderPortraitRes.json();

    let jobPortrait = await pollJobUntilDone(jobPortraitId);
    assert.equal(jobPortrait.status, 'done');
    console.log(`✓ Portrait render finished: ${jobPortrait.outputFileName}`);

    const probePortrait = await probeMedia(jobPortrait.outputPath);
    console.log('   - Probe width:', probePortrait.width, '(expected: 1080)');
    console.log('   - Probe height:', probePortrait.height, '(expected: 1920)');
    console.log('   - Probe FPS:', probePortrait.fps, '(expected: 30)');
    console.log('   - Probe duration:', probePortrait.duration.toFixed(2), 'seconds');
    console.log('   - Probe video codec:', probePortrait.videoCodec, '(expected: h264)');
    console.log('   - Probe audio codec:', probePortrait.audioCodec, '(expected: aac)');
    console.log('   - Probe file size:', (probePortrait.fileSize / 1024).toFixed(1), 'KB');

    assert.equal(probePortrait.width, 1080);
    assert.equal(probePortrait.height, 1920);
    assert.equal(probePortrait.fps, 30);
    assert.equal(probePortrait.videoCodec, 'h264');
    assert.ok(probePortrait.fileSize > 50000);

    // Test 7: Export Landscape MP4 (1920x1080 @ 30 FPS)
    console.log('\n[7/8] Exporting & Probing Landscape MP4 (1920x1080 @ 30 FPS)...');
    const renderLandscapeRes = await fetch(`${BASE_URL}/api/projects/${projectId}/renders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: 'landscape' })
    });
    assert.equal(renderLandscapeRes.status, 202);
    const { jobId: jobLandscapeId } = await renderLandscapeRes.json();

    let jobLandscape = await pollJobUntilDone(jobLandscapeId);
    assert.equal(jobLandscape.status, 'done');
    console.log(`✓ Landscape render finished: ${jobLandscape.outputFileName}`);

    const probeLandscape = await probeMedia(jobLandscape.outputPath);
    console.log('   - Probe width:', probeLandscape.width, '(expected: 1920)');
    console.log('   - Probe height:', probeLandscape.height, '(expected: 1080)');
    console.log('   - Probe FPS:', probeLandscape.fps, '(expected: 30)');
    console.log('   - Probe duration:', probeLandscape.duration.toFixed(2), 'seconds');
    console.log('   - Probe video codec:', probeLandscape.videoCodec, '(expected: h264)');
    console.log('   - Probe audio codec:', probeLandscape.audioCodec, '(expected: aac)');
    console.log('   - Probe file size:', (probeLandscape.fileSize / 1024).toFixed(1), 'KB');

    assert.equal(probeLandscape.width, 1920);
    assert.equal(probeLandscape.height, 1080);
    assert.equal(probeLandscape.fps, 30);
    assert.equal(probeLandscape.videoCodec, 'h264');
    assert.ok(probeLandscape.fileSize > 50000);

    // Test 8: Export 4:5 Portrait Reference Standard (1080x1350 @ 25 FPS)
    console.log('\n[8/8] Exporting & Probing 4:5 Reference Standard MP4 (1080x1350 @ 25 FPS)...');
    const render45Res = await fetch(`${BASE_URL}/api/projects/${projectId}/renders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: 'portrait_4_5' })
    });
    assert.equal(render45Res.status, 202);
    const { jobId: job45Id } = await render45Res.json();

    let job45 = await pollJobUntilDone(job45Id);
    assert.equal(job45.status, 'done');
    console.log(`✓ 4:5 render finished: ${job45.outputFileName}`);

    const probe45 = await probeMedia(job45.outputPath);
    console.log('   - Probe width:', probe45.width, '(expected: 1080)');
    console.log('   - Probe height:', probe45.height, '(expected: 1350)');
    console.log('   - Probe FPS:', probe45.fps, '(expected: 25)');
    console.log('   - Probe duration:', probe45.duration.toFixed(2), 'seconds');
    console.log('   - Probe video codec:', probe45.videoCodec, '(expected: h264)');
    console.log('   - Probe audio codec:', probe45.audioCodec, '(expected: aac)');
    console.log('   - Probe file size:', (probe45.fileSize / 1024).toFixed(1), 'KB');

    assert.equal(probe45.width, 1080);
    assert.equal(probe45.height, 1350);
    assert.equal(probe45.fps, 25);
    assert.equal(probe45.videoCodec, 'h264');
    assert.ok(probe45.fileSize > 50000);

    console.log('\n====================================================');
    console.log('   >>> ALL 8 E2E CRITERIA VERIFIED AND PASSED! <<<  ');
    console.log('====================================================');
  } finally {
    if (serverInstance) {
      try {
        await serverInstance.close();
        console.log('✓ Fastify server shut down cleanly.');
      } catch (_) {}
    }
  }
}

async function pollJobUntilDone(jobId) {
  while (true) {
    const res = await fetch(`${BASE_URL}/api/renders/${jobId}`);
    const data = await res.json();
    if (data.status === 'done' || data.status === 'failed' || data.status === 'cancelled') {
      return data;
    }
    process.stdout.write(`Rendering ${data.targetId}: ${data.percent}% (${data.currentFrame}/${data.totalFrames})\r`);
    await new Promise(r => setTimeout(r, 800));
  }
}

runE2ETests().catch(err => {
  console.error('\nE2E Tests Failed:', err);
  process.exit(1);
});

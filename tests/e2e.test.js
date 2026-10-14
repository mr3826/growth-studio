import assert from 'node:assert/strict';
import { probeMedia } from '../packages/render-adapter/src/index.js';
import fs from 'node:fs';

const BASE_URL = 'http://127.0.0.1:4317';

async function runE2ETests() {
  console.log('====================================================');
  console.log('   KINETIC STUDIO V0.01 — E2E VERIFICATION SUITE   ');
  console.log('====================================================');

  // Test 1: Health check
  console.log('\n[1/7] Testing Server Health & Readiness...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.chrome.available, true);
  console.log('✓ Local server running on 127.0.0.1:4317');
  console.log(`✓ Headless Chrome verified at: ${health.chrome.path}`);

  // Test 2: Create EasyModerator Project
  console.log('\n[2/7] Creating EasyModerator Project...');
  const createRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset: 'easymoderator' })
  });
  assert.equal(createRes.status, 201);
  const project = await createRes.json();
  const projectId = project.project.id;
  assert.ok(projectId);
  console.log(`✓ EasyModerator project created with ID: '${projectId}'`);
  console.log(`✓ Project contains ${project.scenes.length} scenes and ${project.assets.length} assets`);

  // Test 3: Edit Project Content & Animation Settings
  console.log('\n[3/7] Modifying Video Content, Branding & Scene Motion...');
  project.project.name = 'EasyModerator Verified Launch V0.01';
  project.creative.keyMessage = 'Automate Your Customer Chats 24/7';
  project.brand.primaryColor = '#7460D9';
  project.brand.accentColor = '#F4C35E';
  project.scenes[0].headline = 'Overwhelmed by messages?';
  project.scenes[0].subheadline = 'Reply instantly with EasyModerator';
  project.scenes[0].motion = {
    entrance: 'stagger_words',
    exit: 'fade',
    easing: 'spring',
    staggerMilliseconds: 60
  };

  const saveRes = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  });
  assert.equal(saveRes.status, 200);
  console.log('✓ Project edits validated against JSON Schema and saved to disk');

  // Test 4: Reload Project and verify persistence
  console.log('\n[4/7] Verifying Project Persistence (Reload from disk)...');
  const reloadRes = await fetch(`${BASE_URL}/api/projects/${projectId}`);
  assert.equal(reloadRes.status, 200);
  const reloaded = await reloadRes.json();
  assert.equal(reloaded.project.name, 'EasyModerator Verified Launch V0.01');
  assert.equal(reloaded.scenes[0].headline, 'Overwhelmed by messages?');
  console.log('✓ Saved edits accurately recovered from project.json');

  // Test 5: Verify Preview Generation (Portrait and Landscape)
  console.log('\n[5/7] Testing Preview Compositions...');
  const previewPortraitRes = await fetch(`${BASE_URL}/api/projects/${projectId}/preview-html?target=portrait`);
  assert.equal(previewPortraitRes.status, 200);
  const htmlPortrait = await previewPortraitRes.text();
  assert.ok(htmlPortrait.includes('width=1080'));
  assert.ok(htmlPortrait.includes('height=1920'));
  assert.ok(htmlPortrait.includes('Overwhelmed by messages?'));

  const previewLandscapeRes = await fetch(`${BASE_URL}/api/projects/${projectId}/preview-html?target=landscape`);
  assert.equal(previewLandscapeRes.status, 200);
  const htmlLandscape = await previewLandscapeRes.text();
  assert.ok(htmlLandscape.includes('width=1920'));
  assert.ok(htmlLandscape.includes('height=1080'));
  console.log('✓ Both 1080x1920 Portrait and 1920x1080 Landscape preview compositions generated cleanly');

  // Test 6: Export Portrait MP4 (1080x1920 @ 30 FPS)
  console.log('\n[6/7] Exporting & Probing Portrait MP4 (1080x1920 @ 30 FPS)...');
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
  console.log('\n[7/7] Exporting & Probing Landscape MP4 (1920x1080 @ 30 FPS)...');
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

  console.log('\n====================================================');
  console.log('   >>> ALL 7 E2E CRITERIA VERIFIED AND PASSED! <<<  ');
  console.log('====================================================');
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

import assert from 'node:assert/strict';
import { probeMedia } from '../packages/render-adapter/src/index.js';
import { buildServer } from '../apps/local-server/src/index.js';
import { randomUUID } from 'node:crypto';

async function runE2ETests() {
  console.log('====================================================');
  console.log('   GROWTH STUDIO V0.03 — E2E VERIFICATION SUITE    ');
  console.log('====================================================');

  const serverInstance = await buildServer();
  let projectId = null;

  try {
    // Test 1: Health check
    console.log('\n[1/8] Testing Server Health & Readiness...');
    const healthRes = await serverInstance.inject({ method: 'GET', url: '/api/health' });
    assert.equal(healthRes.statusCode, 200);
    const health = healthRes.json();
    assert.equal(health.status, 'ok');
    assert.equal(health.chrome.available, true);
    console.log(`✓ Local API routes ready in isolated test storage`);
    console.log(`✓ Headless Chrome verified at: ${health.chrome.path}`);
    console.log(`✓ Storage Volume: ${health.storage.root} (${health.storage.freeGB} GB free)`);

    // Test 2: Create Generic Reference-Aligned Guided Story Starter Project
    console.log('\n[2/8] Creating Generic Starter Project (guided_bangla)...');
    const createRes = await serverInstance.inject({ method: 'POST', url: '/api/projects', payload: { preset: 'blank', name: `Growth Studio E2E ${randomUUID()}`, language: 'bn' } });
    assert.equal(createRes.statusCode, 201);
    const project = createRes.json();
    projectId = project.project.id;
    assert.ok(projectId);
    console.log(`✓ Neutral Bengali project created with ID: '${projectId}'`);
    console.log(`✓ Project contains ${project.scenes.length} scenes and ${project.assets.length} assets`);

    // Test 3: Edit Project Content & Animation Settings
    console.log('\n[3/8] Modifying Video Content, Branding & Scene Motion...');
    project.project.name = 'Growth Studio Offline Export Test';
    project.creative.keyMessage = 'নিজের পণ্য, ব্র্যান্ড ও প্রমাণিত তথ্য দিয়ে একটি ভিডিও তৈরি করুন।';
    project.brand.name = 'আপনার ব্র্যান্ড';
    project.brand.primaryColor = '#7460D9';
    project.brand.backgroundColor = '#17223B';
    project.brand.accentColor = '#F4C35E';
    project.creative.cta = { label: 'পরবর্তী পদক্ষেপ', destination: '' };
    project.scenes[0].headline = 'আপনার গল্পের শুরু এখান থেকে';
    project.scenes[0].subheadline = 'নিজের পণ্য ও সেবার সত্য তথ্য যোগ করুন।';
    project.scenes[0].highlightWords = ['গল্পের শুরু'];
    project.scenes[0].motion = {
      entrance: 'stagger_words',
      exit: 'fade',
      easing: 'spring',
      staggerMilliseconds: 70
    };

    const saveRes = await serverInstance.inject({ method: 'PUT', url: `/api/projects/${projectId}`, payload: project });
    assert.equal(saveRes.statusCode, 200, saveRes.body);
    console.log('✓ Project edits validated against JSON Schema and saved to disk');

    // Test 4: Reload Project and verify persistence
    console.log('\n[4/8] Verifying Project Persistence (Reload from disk)...');
    const reloadRes = await serverInstance.inject({ method: 'GET', url: `/api/projects/${projectId}` });
    assert.equal(reloadRes.statusCode, 200);
    const reloaded = reloadRes.json();
    assert.equal(reloaded.project.name, 'Growth Studio Offline Export Test');
    assert.equal(reloaded.scenes[0].headline, 'আপনার গল্পের শুরু এখান থেকে');
    assert.equal(JSON.stringify(reloaded).includes('DukanBot'), false);
    console.log('✓ Saved edits accurately recovered from project.json');

    // Test 5: Verify Preview Generation (Portrait, Landscape, and 4:5 Reference)
    console.log('\n[5/8] Testing Preview Compositions (4:5, 9:16, 16:9)...');
    const preview45Res = await serverInstance.inject({ method: 'GET', url: `/api/projects/${projectId}/preview-html?target=portrait_4_5` });
    assert.equal(preview45Res.statusCode, 200);
    const html45 = preview45Res.body;
    assert.ok(html45.includes('width=1080'));
    assert.ok(html45.includes('height=1350'));
    assert.ok(html45.includes('আপনার গল্পের শুরু'));

    const previewPortraitRes = await serverInstance.inject({ method: 'GET', url: `/api/projects/${projectId}/preview-html?target=portrait` });
    assert.equal(previewPortraitRes.statusCode, 200);
    const htmlPortrait = previewPortraitRes.body;
    assert.ok(htmlPortrait.includes('width=1080'));
    assert.ok(htmlPortrait.includes('height=1920'));

    const previewLandscapeRes = await serverInstance.inject({ method: 'GET', url: `/api/projects/${projectId}/preview-html?target=landscape` });
    assert.equal(previewLandscapeRes.statusCode, 200);
    const htmlLandscape = previewLandscapeRes.body;
    assert.ok(htmlLandscape.includes('width=1920'));
    assert.ok(htmlLandscape.includes('height=1080'));
    console.log('✓ All 3 preview targets (4:5, 9:16, 16:9) generated and verified cleanly');

    // Test 6: Export Portrait MP4 (1080x1920 @ 30 FPS)
    console.log('\n[6/8] Exporting & Probing Portrait MP4 (1080x1920 @ 30 FPS)...');
    const renderPortraitRes = await serverInstance.inject({ method: 'POST', url: `/api/projects/${projectId}/renders`, payload: { targetId: 'portrait' } });
    assert.equal(renderPortraitRes.statusCode, 202);
    const { jobId: jobPortraitId } = renderPortraitRes.json();

    let jobPortrait = await pollJobUntilDone(serverInstance, jobPortraitId);
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
    const renderLandscapeRes = await serverInstance.inject({ method: 'POST', url: `/api/projects/${projectId}/renders`, payload: { targetId: 'landscape' } });
    assert.equal(renderLandscapeRes.statusCode, 202);
    const { jobId: jobLandscapeId } = renderLandscapeRes.json();

    let jobLandscape = await pollJobUntilDone(serverInstance, jobLandscapeId);
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
    const render45Res = await serverInstance.inject({ method: 'POST', url: `/api/projects/${projectId}/renders`, payload: { targetId: 'portrait_4_5' } });
    assert.equal(render45Res.statusCode, 202);
    const { jobId: job45Id } = render45Res.json();

    let job45 = await pollJobUntilDone(serverInstance, job45Id);
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
    if (projectId) await serverInstance.inject({ method: 'DELETE', url: `/api/projects/${projectId}` });
    await serverInstance.close();
    console.log('✓ Fastify server shut down cleanly.');
  }
}

async function pollJobUntilDone(serverInstance, jobId) {
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    const res = await serverInstance.inject({ method: 'GET', url: `/api/renders/${jobId}` });
    const data = res.json();
    if (data.status === 'done' || data.status === 'failed' || data.status === 'cancelled') {
      return data;
    }
    process.stdout.write(`Rendering ${data.targetId}: ${data.percent}% (${data.currentFrame}/${data.totalFrames})\r`);
    await new Promise(r => setTimeout(r, 800));
  }
  throw new Error(`Render job '${jobId}' exceeded the 8 minute test timeout.`);
}

runE2ETests().catch(err => {
  console.error('\nE2E Tests Failed:', err);
  process.exit(1);
});

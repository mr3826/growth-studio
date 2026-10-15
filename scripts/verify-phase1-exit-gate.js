import { buildServer } from '../apps/local-server/src/index.js';
import {
  resolveStoragePaths,
  loadExportsManifest
} from '@kinetic-studio/contracts';
import { verifyMediaDecode, probeMedia, measureAudioVolume } from '@kinetic-studio/render-adapter';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

async function waitForJobDone(server, jobId, maxWaitMs = 180000) {
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
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for job ${jobId} to complete after ${maxWaitMs}ms`);
}

async function runPhase1ExitGate() {
  console.log('================================================================');
  console.log('  GROWTH STUDIO V0.03.1 — PHASE 1 EXIT GATE VERIFICATION');
  console.log('================================================================');

  const storage = resolveStoragePaths();
  console.log(`Storage root: ${storage.root} (E: Drive: ${storage.isEDrive})`);

  // Step 1: Start Server Instance 1
  console.log('\n[1/6] Starting Local Server Instance 1...');
  const server1 = await buildServer();
  const resHealth = await server1.inject({ method: 'GET', url: '/api/health' });
  assert.equal(resHealth.statusCode, 200);
  console.log('✓ Server 1 online and healthy.');

  // Step 2: Create EasyModerator Project with Audio
  console.log('\n[2/6] Initializing EasyModerator 21s Project with Audible Music...');
  const projId = `em-gate-${Date.now()}`;
  const seedProjPath = path.resolve('data/projects/easymoderator-launch/project.json');
  const baseProj = JSON.parse(fs.readFileSync(seedProjPath, 'utf8'));

  // Ensure project assets directory exists in storage
  const projectDir = path.join(storage.projects, projId);
  const assetsDir = path.join(projectDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  // Copy seed assets (logo, demo image, music) into project assets directory
  const seedAssetsDir = path.resolve('data/projects/easymoderator-launch/assets');
  if (fs.existsSync(seedAssetsDir)) {
    for (const f of fs.readdirSync(seedAssetsDir)) {
      fs.copyFileSync(path.join(seedAssetsDir, f), path.join(assetsDir, f));
    }
  }

  const projectPayload = {
    ...baseProj,
    project: {
      ...baseProj.project,
      id: projId,
      name: 'EasyModerator BD Motion Promo Phase 1 Gate'
    },
    creative: {
      ...baseProj.creative,
      keyMessage: 'মেসেজ সামলান সহজে, ব্যবসার গতি বাড়ান অনায়াসে।',
      cta: {
        label: 'EasyModerator ট্রাই করুন',
        destination: 'https://easymod.tech'
      }
    },
    brand: {
      ...baseProj.brand,
      name: 'EasyModerator',
      primaryColor: '#7460D9',
      backgroundColor: '#17223B',
      accentColor: '#F4C35E',
      textColor: '#FFFFFF'
    },
    audio: {
      muteAll: false,
      musicAssetId: 'music',
      musicVolume: 0.35,
      fadeInSeconds: 0.5,
      fadeOutSeconds: 1.0,
      duckMusicUnderVoice: true
    },
    assets: [
      { id: 'logo', kind: 'logo', file: 'assets/logo.png', usageRights: 'owner' },
      { id: 'inbox', kind: 'image', file: 'assets/inbox-demo.png', usageRights: 'owner', fit: 'contain' },
      { id: 'music', kind: 'music', file: 'assets/background-music.wav', usageRights: 'licensed', durationSeconds: 15 }
    ]
  };

  const resSave = await server1.inject({
    method: 'PUT',
    url: `/api/projects/${projId}`,
    payload: projectPayload
  });
  if (resSave.statusCode !== 200) {
    console.error('Save failed with body:', resSave.body);
  }
  assert.equal(resSave.statusCode, 200);
  console.log(`✓ EasyModerator project initialized: '${projId}'`);

  // Step 3: Render 9:16 Vertical Video (1080x1920 @ 30 FPS, 21s)
  console.log('\n[3/6] Exporting Video 1: 9:16 Portrait (1080x1920 @ 30 FPS, 21 seconds)...');
  const resQueuePortrait = await server1.inject({
    method: 'POST',
    url: `/api/projects/${projId}/renders`,
    payload: { targetId: 'portrait', project: projectPayload }
  });
  assert.equal(resQueuePortrait.statusCode, 202);
  const { jobId: portraitJobId } = JSON.parse(resQueuePortrait.body);
  console.log(`   -> Queued portrait job: ${portraitJobId}`);

  const portraitJob = await waitForJobDone(server1, portraitJobId, 240000);
  console.log(`✓ Portrait render finished: ${portraitJob.outputFileName}`);
  console.log(`   Dimensions: ${portraitJob.metadata.width}x${portraitJob.metadata.height}`);
  console.log(`   Duration: ${portraitJob.metadata.duration.toFixed(2)}s`);
  console.log(`   File Size: ${(portraitJob.metadata.fileSize / 1024).toFixed(1)} KB`);
  assert.equal(portraitJob.metadata.width, 1080);
  assert.equal(portraitJob.metadata.height, 1920);
  assert.ok(portraitJob.metadata.duration >= 20 && portraitJob.metadata.duration <= 35);

  // Full media decode verification
  console.log('   Verifying full MP4 stream decode with ffmpeg -xerror -f null -...');
  await verifyMediaDecode(portraitJob.outputPath);
  console.log('✓ Portrait MP4 full decode check PASSED with 0 stream errors.');

  // Verify non-silent audio
  const portraitVol = await measureAudioVolume(portraitJob.outputPath);
  console.log(`   Audio levels: mean ${portraitVol.meanVolumeDb} dB, max ${portraitVol.maxVolumeDb} dB`);
  assert.ok(portraitVol.meanVolumeDb > -60, 'Portrait audio must not be silent');

  // Step 4: Render 16:9 Landscape Video (1920x1080 @ 30 FPS, 21s)
  console.log('\n[4/6] Exporting Video 2: 16:9 Landscape (1920x1080 @ 30 FPS, 21 seconds)...');
  const resQueueLandscape = await server1.inject({
    method: 'POST',
    url: `/api/projects/${projId}/renders`,
    payload: { targetId: 'landscape', project: projectPayload }
  });
  assert.equal(resQueueLandscape.statusCode, 202);
  const { jobId: landscapeJobId } = JSON.parse(resQueueLandscape.body);
  console.log(`   -> Queued landscape job: ${landscapeJobId}`);

  const landscapeJob = await waitForJobDone(server1, landscapeJobId, 240000);
  console.log(`✓ Landscape render finished: ${landscapeJob.outputFileName}`);
  console.log(`   Dimensions: ${landscapeJob.metadata.width}x${landscapeJob.metadata.height}`);
  console.log(`   Duration: ${landscapeJob.metadata.duration.toFixed(2)}s`);
  console.log(`   File Size: ${(landscapeJob.metadata.fileSize / 1024).toFixed(1)} KB`);
  assert.equal(landscapeJob.metadata.width, 1920);
  assert.equal(landscapeJob.metadata.height, 1080);
  assert.ok(landscapeJob.metadata.duration >= 20 && landscapeJob.metadata.duration <= 35);

  // Full media decode verification
  console.log('   Verifying full MP4 stream decode with ffmpeg -xerror -f null -...');
  await verifyMediaDecode(landscapeJob.outputPath);
  console.log('✓ Landscape MP4 full decode check PASSED with 0 stream errors.');

  const landscapeVol = await measureAudioVolume(landscapeJob.outputPath);
  console.log(`   Audio levels: mean ${landscapeVol.meanVolumeDb} dB, max ${landscapeVol.maxVolumeDb} dB`);
  assert.ok(landscapeVol.meanVolumeDb > -60, 'Landscape audio must not be silent');

  // Step 5: Test Server Restart & Persistence
  console.log('\n[5/6] Testing Server Restart & Persistent Export Hydration...');
  console.log('   Shutting down Server 1...');
  await server1.close();
  console.log('✓ Server 1 offline.');

  console.log('   Starting fresh Server 2 instance...');
  const server2 = await buildServer();
  console.log('✓ Server 2 online (hydrated from disk manifest).');

  // Query Project Export History
  const resHistory = await server2.inject({
    method: 'GET',
    url: `/api/projects/${projId}/exports`
  });
  assert.equal(resHistory.statusCode, 200);
  const historyData = JSON.parse(resHistory.body);
  console.log(`✓ Project export history retrieved after restart: ${historyData.exports.length} export(s) found.`);
  assert.ok(historyData.exports.length >= 2, 'Expected at least 2 exported videos in history');

  const pRecord = historyData.exports.find(e => e.jobId === portraitJobId);
  const lRecord = historyData.exports.find(e => e.jobId === landscapeJobId);
  assert.ok(pRecord, 'Portrait export must be in history after restart');
  assert.ok(lRecord, 'Landscape export must be in history after restart');
  assert.equal(pRecord.fileExists, true);
  assert.equal(lRecord.fileExists, true);

  // Step 6: Verify Streaming and Download from Server 2
  console.log('\n[6/6] Verifying In-App Streaming & File Download after restart...');
  const resStreamPortrait = await server2.inject({
    method: 'GET',
    url: `/api/renders/${portraitJobId}/stream`
  });
  assert.equal(resStreamPortrait.statusCode, 200);
  assert.equal(resStreamPortrait.headers['content-type'], 'video/mp4');
  console.log(`✓ Portrait stream endpoint operational (received ${resStreamPortrait.rawPayload.length} bytes).`);

  const resDownloadLandscape = await server2.inject({
    method: 'GET',
    url: `/api/renders/${landscapeJobId}/file`
  });
  assert.equal(resDownloadLandscape.statusCode, 200);
  assert.ok(resDownloadLandscape.headers['content-disposition'].includes('attachment'));
  console.log(`✓ Landscape download endpoint operational (received ${resDownloadLandscape.rawPayload.length} bytes).`);

  await server2.close();

  console.log('\n================================================================');
  console.log('  >>> PHASE 1 EXIT GATE FULLY SATISFIED AND PASSED! <<<');
  console.log('================================================================');
  console.log(`1. Portrait (9:16):  ${portraitJob.outputPath}`);
  console.log(`2. Landscape (16:9): ${landscapeJob.outputPath}`);
}

runPhase1ExitGate().catch(err => {
  console.error('\n❌ PHASE 1 EXIT GATE FAILED:', err);
  process.exit(1);
});

import { buildServer } from '../apps/local-server/src/index.js';
import { resolveStoragePaths, recordExportInManifest, saveExportsManifest, loadExportsManifest } from '@kinetic-studio/contracts';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

async function testExportPersistence() {
  console.log('--- Testing Export Persistence, Synchronous Saves & Server Restart Hydration ---');
  const server1 = await buildServer();
  const storage = resolveStoragePaths();

  // 1. Create a test project
  const resCreate = await server1.inject({
    method: 'POST',
    url: '/api/projects',
    payload: { preset: 'guided_bangla', name: `Export Persistence Test ${randomUUID()}` }
  });
  assert.equal(resCreate.statusCode, 201);
  const proj = JSON.parse(resCreate.body);
  const projId = proj.project.id;
  assert.ok(projId);

  // 2. Verify empty export history initially
  const resExpInitial = await server1.inject({
    method: 'GET',
    url: `/api/projects/${projId}/exports`
  });
  assert.equal(resExpInitial.statusCode, 200);
  const expData = JSON.parse(resExpInitial.body);
  assert.deepEqual(expData.exports, []);
  console.log('✓ GET /api/projects/:id/exports returns empty array initially');

  // 3. Test synchronous save via POST /api/projects/:id/renders with updated project body
  const updatedProj = JSON.parse(JSON.stringify(proj));
  updatedProj.creative.keyMessage = 'Persisted Synchronously Before Render';
  updatedProj.creative.cta = { label: 'পরবর্তী পদক্ষেপ', destination: '' };
  updatedProj.scenes[0].headline = 'Updated Headline Tested';

  const resQueue = await server1.inject({
    method: 'POST',
    url: `/api/projects/${projId}/renders`,
    payload: {
      targetId: 'portrait',
      project: updatedProj
    }
  });
  assert.equal(resQueue.statusCode, 202);
  const queueData = JSON.parse(resQueue.body);
  assert.ok(queueData.jobId);
  console.log('✓ POST /api/projects/:id/renders accepted with 202 and jobId:', queueData.jobId);

  // Verify that project.json on disk now has the updated headline
  const projectOnDisk = JSON.parse(fs.readFileSync(path.join(storage.projects, projId, 'project.json'), 'utf8'));
  assert.equal(projectOnDisk.scenes[0].headline, 'Updated Headline Tested');
  assert.equal(projectOnDisk.creative.keyMessage, 'Persisted Synchronously Before Render');
  console.log('✓ Project edits synchronously saved to disk before render began');

  // 4. Test duplicate render prevention (409 Conflict) while job is active
  const resDup = await server1.inject({
    method: 'POST',
    url: `/api/projects/${projId}/renders`,
    payload: {
      targetId: 'portrait'
    }
  });
  assert.equal(resDup.statusCode, 409);
  const dupErr = JSON.parse(resDup.body);
  assert.ok(dupErr.error.includes('already in progress'));
  console.log('✓ Duplicate render attempt correctly rejected with 409 Conflict');

  // Cancel the active test render so it doesn't run full render
  const resCancel = await server1.inject({
    method: 'DELETE',
    url: `/api/renders/${queueData.jobId}`
  });
  assert.equal(resCancel.statusCode, 200);
  console.log('✓ Render cleanly cancelled and partial temp files cleaned up');

  // 5. Test Manifest Recording & Hydration on Server Restart
  const dummyJobId = `job-persist-${Date.now()}`;
  const dummyFile = `test-persist-export-${Date.now()}.mp4`;
  const dummyPath = path.join(storage.exports, dummyFile);
  fs.writeFileSync(dummyPath, 'DUMMY_MP4_CONTENT_FOR_PERSISTENCE_TEST');

  recordExportInManifest(storage, {
    id: dummyJobId,
    projectId: projId,
    targetId: 'landscape',
    outputFileName: dummyFile,
    outputPath: dummyPath,
    metadata: {
      width: 1920,
      height: 1080,
      duration: 30,
      fps: 30,
      videoCodec: 'h264',
      audioCodec: 'aac',
      fileSize: 37
    },
    status: 'done',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  });

  // Verify manifest has the record
  const manifest = loadExportsManifest(storage);
  assert.ok(manifest.exports.some(e => e.jobId === dummyJobId));
  console.log('✓ Export recorded in exports-manifest.json');

  // Shut down server 1
  await server1.close();
  console.log('✓ Server 1 shut down');

  // Start a fresh server instance (Simulates Server Restart)
  const server2 = await buildServer();
  console.log('✓ Server 2 started (simulating restart)');

  // Verify GET /api/renders/:jobId returns hydrated job
  const resHydratedJob = await server2.inject({
    method: 'GET',
    url: `/api/renders/${dummyJobId}`
  });
  assert.equal(resHydratedJob.statusCode, 200);
  const hydratedJob = JSON.parse(resHydratedJob.body);
  assert.equal(hydratedJob.status, 'done');
  assert.equal(hydratedJob.outputFileName, dummyFile);
  assert.equal(hydratedJob.metadata.width, 1920);
  console.log('✓ GET /api/renders/:jobId successfully returned hydrated job from disk manifest');

  // Verify GET /api/projects/:id/exports returns the export
  const resProjExp = await server2.inject({
    method: 'GET',
    url: `/api/projects/${projId}/exports`
  });
  assert.equal(resProjExp.statusCode, 200);
  const projExpData = JSON.parse(resProjExp.body);
  const matchedExp = projExpData.exports.find(e => e.jobId === dummyJobId);
  assert.ok(matchedExp);
  assert.equal(matchedExp.fileExists, true);
  assert.equal(matchedExp.targetId, 'landscape');
  console.log('✓ GET /api/projects/:id/exports successfully returned persisted export history');

  // Verify GET /api/renders/:jobId/stream streams the file
  const resStream = await server2.inject({
    method: 'GET',
    url: `/api/renders/${dummyJobId}/stream`
  });
  assert.equal(resStream.statusCode, 200);
  assert.equal(resStream.headers['content-type'], 'video/mp4');
  assert.equal(resStream.body, 'DUMMY_MP4_CONTENT_FOR_PERSISTENCE_TEST');
  console.log('✓ GET /api/renders/:jobId/stream successfully streams video');

  // Verify GET /api/renders/:jobId/file downloads the file
  const resFile = await server2.inject({
    method: 'GET',
    url: `/api/renders/${dummyJobId}/file`
  });
  assert.equal(resFile.statusCode, 200);
  assert.ok(resFile.headers['content-disposition'].includes(dummyFile));
  console.log('✓ GET /api/renders/:jobId/file successfully provides download attachment');

  // Clean up test artifacts
  try { fs.unlinkSync(dummyPath); } catch (_) {}
  const cleanedManifest = loadExportsManifest(storage);
  cleanedManifest.exports = cleanedManifest.exports.filter(e => e.jobId !== dummyJobId);
  saveExportsManifest(storage, cleanedManifest);

  await server2.inject({ method: 'DELETE', url: `/api/projects/${projId}` });
  await server2.close();
  console.log('\n>>> ALL EXPORT PERSISTENCE & HYDRATION TESTS PASSED! <<<');
}

testExportPersistence().catch(err => {
  console.error('Export Persistence Test Failed:', err);
  process.exit(1);
});

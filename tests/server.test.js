import { buildServer } from '../apps/local-server/src/index.js';
import assert from 'node:assert/strict';

async function testServer() {
  console.log('--- Testing Fastify Server API ---');
  const server = await buildServer();

  // Test 1: Health
  const resHealth = await server.inject({ method: 'GET', url: '/api/health' });
  assert.equal(resHealth.statusCode, 200);
  const healthData = JSON.parse(resHealth.body);
  assert.equal(healthData.status, 'ok');
  assert.equal(healthData.chrome.available, true);
  console.log('✓ GET /api/health OK');

  // Test 2: Templates
  const resTemplates = await server.inject({ method: 'GET', url: '/api/templates' });
  assert.equal(resTemplates.statusCode, 200);
  const templates = JSON.parse(resTemplates.body);
  assert.ok(Array.isArray(templates));
  assert.ok(templates.some(t => t.id === 'bold_kinetic'));
  console.log('✓ GET /api/templates OK (found bold_kinetic)');

  // Test 3: Create EasyModerator Project
  const resCreate = await server.inject({
    method: 'POST',
    url: '/api/projects',
    payload: { preset: 'easymoderator' }
  });
  assert.equal(resCreate.statusCode, 201);
  const createdProj = JSON.parse(resCreate.body);
  const projId = createdProj.project.id;
  assert.ok(projId);
  console.log(`✓ POST /api/projects OK (created '${projId}')`);

  // Test 4: Get Project
  const resGet = await server.inject({ method: 'GET', url: `/api/projects/${projId}` });
  assert.equal(resGet.statusCode, 200);
  const fetchedProj = JSON.parse(resGet.body);
  assert.equal(fetchedProj.project.name, 'EasyModerator Launch Film');
  console.log('✓ GET /api/projects/:id OK');

  // Test 5: Update Project
  fetchedProj.creative.keyMessage = 'Updated merchant message for testing';
  const resPut = await server.inject({
    method: 'PUT',
    url: `/api/projects/${projId}`,
    payload: fetchedProj
  });
  assert.equal(resPut.statusCode, 200);
  console.log('✓ PUT /api/projects/:id OK');

  // Test 6: Preflight Check
  const resPreflight = await server.inject({
    method: 'POST',
    url: `/api/projects/${projId}/preflight`
  });
  assert.equal(resPreflight.statusCode, 200);
  const preflight = JSON.parse(resPreflight.body);
  assert.equal(preflight.passed, true);
  console.log('✓ POST /api/projects/:id/preflight OK (passed)');

  // Test 7: Compile Preview Data
  const resPreview = await server.inject({
    method: 'POST',
    url: `/api/projects/${projId}/preview`,
    payload: { targetId: 'portrait' }
  });
  assert.equal(resPreview.statusCode, 200);
  const previewData = JSON.parse(resPreview.body);
  assert.ok(previewData.totalFrames > 0);
  console.log('✓ POST /api/projects/:id/preview OK');

  // Test 8: Get HTML Preview
  const resPreviewHtml = await server.inject({
    method: 'GET',
    url: `/api/projects/${projId}/preview-html?target=portrait`
  });
  assert.equal(resPreviewHtml.statusCode, 200);
  assert.ok(resPreviewHtml.body.includes('<!DOCTYPE html>'));
  assert.ok(resPreviewHtml.body.includes('seekToFrame'));
  console.log('✓ GET /api/projects/:id/preview-html OK');

  await server.close();
  console.log('>>> ALL SERVER API TESTS PASSED SUCCESSFULLY! <<<');
}

testServer().catch(err => {
  console.error('Server API Test Failed:', err);
  process.exit(1);
});

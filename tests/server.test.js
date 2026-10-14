import { buildServer } from '../apps/local-server/src/index.js';
import assert from 'node:assert/strict';

async function testServer() {
  console.log('--- Testing Fastify Server API & Negative Gates ---');
  const server = await buildServer();

  // Test 1: Health & Storage
  const resHealth = await server.inject({ method: 'GET', url: '/api/health' });
  assert.equal(resHealth.statusCode, 200);
  const healthData = JSON.parse(resHealth.body);
  assert.equal(healthData.status, 'ok');
  assert.equal(healthData.chrome.available, true);
  assert.ok(healthData.storage.freeGB > 0);
  console.log(`✓ GET /api/health OK (Storage root: ${healthData.storage.root}, ${healthData.storage.freeGB} GB free)`);

  // Test 2: Templates (All 3 required archetypes)
  const resTemplates = await server.inject({ method: 'GET', url: '/api/templates' });
  assert.equal(resTemplates.statusCode, 200);
  const templates = JSON.parse(resTemplates.body);
  assert.ok(Array.isArray(templates));
  assert.ok(templates.some(t => t.id === 'bold_kinetic'));
  assert.ok(templates.some(t => t.id === 'guided_product_story'));
  assert.ok(templates.some(t => t.id === 'app_showcase'));
  console.log('✓ GET /api/templates OK (Found all 3 archetypes: bold_kinetic, guided_product_story, app_showcase)');

  // Test 3: Starters API
  const resStarters = await server.inject({ method: 'GET', url: '/api/starters' });
  assert.equal(resStarters.statusCode, 200);
  const starters = JSON.parse(resStarters.body);
  assert.equal(starters.length, 4);
  assert.ok(starters.some(s => s.id === 'guided_bangla'));
  console.log('✓ GET /api/starters OK (4 starters including guided_bangla)');

  // Test 4: Create Bangla Guided Story Starter Project
  const resCreateBangla = await server.inject({
    method: 'POST',
    url: '/api/projects',
    payload: { preset: 'guided_bangla' }
  });
  assert.equal(resCreateBangla.statusCode, 201);
  const banglaProj = JSON.parse(resCreateBangla.body);
  const banglaProjId = banglaProj.project.id;
  assert.ok(banglaProjId);
  assert.equal(banglaProj.template.id, 'guided_product_story');
  console.log(`✓ POST /api/projects with 'guided_bangla' OK (created '${banglaProjId}')`);

  // Test 5: Preflight Check for 4:5 Target
  const resPreflight45 = await server.inject({
    method: 'POST',
    url: `/api/projects/${banglaProjId}/preflight`,
    payload: { targetId: 'portrait_4_5' }
  });
  assert.equal(resPreflight45.statusCode, 200);
  const preflight45 = JSON.parse(resPreflight45.body);
  assert.equal(preflight45.passed, true);
  assert.ok(preflight45.storage.hasHeadroom);
  console.log('✓ POST /api/projects/:id/preflight for portrait_4_5 OK');

  // Test 6: Compile 4:5 Preview Data & HTML
  const resPreview45 = await server.inject({
    method: 'POST',
    url: `/api/projects/${banglaProjId}/preview`,
    payload: { targetId: 'portrait_4_5' }
  });
  assert.equal(resPreview45.statusCode, 200);
  const preview45Data = JSON.parse(resPreview45.body);
  assert.equal(preview45Data.target.aspectRatio, '4:5');
  assert.equal(preview45Data.target.width, 1080);
  assert.equal(preview45Data.target.height, 1350);
  assert.equal(preview45Data.target.fps, 25);
  console.log('✓ POST /api/projects/:id/preview for 4:5 @ 25 FPS OK');

  const resHtml45 = await server.inject({
    method: 'GET',
    url: `/api/projects/${banglaProjId}/preview-html?target=portrait_4_5`
  });
  assert.equal(resHtml45.statusCode, 200);
  assert.ok(resHtml45.body.includes('width=1080'));
  assert.ok(resHtml45.body.includes('height=1350'));
  assert.ok(resHtml45.body.includes('seekToFrame'));
  console.log('✓ GET /api/projects/:id/preview-html for portrait_4_5 OK');

  // --- NEGATIVE TESTS ---
  console.log('\n--- Running Negative & Security Tests ---');

  // Negative Test 1: Invalid project schema rejected with 400
  const resBadSchema = await server.inject({
    method: 'PUT',
    url: `/api/projects/${banglaProjId}`,
    payload: { invalid: 'not a valid kinetic project' }
  });
  assert.equal(resBadSchema.statusCode, 400);
  const badSchemaErr = JSON.parse(resBadSchema.body);
  assert.equal(badSchemaErr.error, 'Project schema validation failed');
  console.log('✓ Negative: Invalid project schema correctly rejected with 400');

  // Negative Test 2: Non-existent project returns 404
  const resNotFound = await server.inject({
    method: 'GET',
    url: '/api/projects/non-existent-uuid-12345'
  });
  assert.equal(resNotFound.statusCode, 404);
  console.log('✓ Negative: Non-existent project correctly returns 404');

  // Negative Test 3: Path traversal attempt in project ID returns 404 / rejected
  const resTraversal = await server.inject({
    method: 'GET',
    url: '/api/projects/..%2F..%2Fwindows%2Fsystem32'
  });
  assert.equal(resTraversal.statusCode, 404);
  console.log('✓ Negative: Path traversal attempt safely handled/rejected');

  // Negative Test 4: Cancel non-existent render job returns 404
  const resCancel404 = await server.inject({
    method: 'DELETE',
    url: '/api/renders/non-existent-job-xyz'
  });
  assert.equal(resCancel404.statusCode, 404);
  console.log('✓ Negative: Cancelling non-existent render job returns 404');

  await server.close();
  console.log('\n>>> ALL SERVER & NEGATIVE TESTS PASSED SUCCESSFULLY! <<<');
}

testServer().catch(err => {
  console.error('Server API Test Failed:', err);
  process.exit(1);
});

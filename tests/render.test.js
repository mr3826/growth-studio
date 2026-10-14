import { createBlankProject } from '../packages/contracts/src/index.js';
import { compileComposition } from '../packages/template-engine/src/index.js';
import { renderVideo, probeMedia } from '../packages/render-adapter/src/index.js';
import { resolveStoragePaths } from '../packages/contracts/src/storage.js';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

async function testRender() {
  console.log('--- Starting Test Render & Cancellation Verification ---');
  const storage = resolveStoragePaths();
  const project = createBlankProject('Test Render Promo');
  project.scenes = [
    {
      id: 'test-hook',
      kind: 'kinetic_text',
      durationSeconds: 1.5,
      headline: 'Kinetic Studio',
      subheadline: 'Offline Video Generator',
      highlightWords: ['Kinetic'],
      motion: { entrance: 'stagger_words', exit: 'fade' }
    }
  ];

  const targetId = 'portrait';
  const comp = compileComposition({ project, targetId });
  const outputPath = path.join(storage.exports, 'test-render-portrait.mp4');

  if (fs.existsSync(outputPath)) {
    try { fs.unlinkSync(outputPath); } catch {}
  }

  console.log(`[1/2] Compiling ${comp.totalFrames} frames (${comp.totalDuration}s) at ${comp.target.width}x${comp.target.height}`);

  const result = await renderVideo({
    compositionHtml: comp.html,
    target: comp.target,
    totalFrames: comp.totalFrames,
    totalDuration: comp.totalDuration,
    outputPath,
    tempParentDir: storage.renders,
    onProgress: (p) => {
      if (p.currentFrame % 15 === 0 || p.currentFrame === p.totalFrames) {
        console.log(`Rendering progress: ${p.percent}% (${p.currentFrame}/${p.totalFrames})`);
      }
    }
  });

  assert.equal(result.success, true);
  const probe = await probeMedia(outputPath);
  assert.equal(probe.width, 1080);
  assert.equal(probe.height, 1920);
  assert.equal(probe.videoCodec, 'h264');
  assert.ok(probe.fileSize > 10000);
  console.log(`✓ Render successful and probed: ${probe.width}x${probe.height}, ${probe.fileSize} bytes`);

  // Test 2: Verify Cancellation handling
  console.log('\n[2/2] Testing AbortController Cancellation...');
  const cancelController = new AbortController();
  const cancelOutputPath = path.join(storage.exports, 'test-cancelled-render.mp4');
  if (fs.existsSync(cancelOutputPath)) {
    try { fs.unlinkSync(cancelOutputPath); } catch {}
  }

  // Create longer composition for cancellation
  const longProject = createBlankProject('Cancellation Test Project');
  longProject.scenes = [
    { id: 's1', kind: 'kinetic_text', durationSeconds: 10, headline: 'Long render to cancel' }
  ];
  const longComp = compileComposition({ project: longProject, targetId: 'portrait' });

  // Cancel immediately after render starts
  setTimeout(() => {
    console.log('   -> Dispatching abort signal to running render...');
    cancelController.abort();
  }, 1000);

  let caughtError = null;
  try {
    await renderVideo({
      compositionHtml: longComp.html,
      target: longComp.target,
      totalFrames: longComp.totalFrames,
      totalDuration: longComp.totalDuration,
      outputPath: cancelOutputPath,
      tempParentDir: storage.renders,
      signal: cancelController.signal
    });
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError, 'Expected renderVideo to reject when aborted');
  assert.ok(
    caughtError.message.toLowerCase().includes('cancel') || caughtError.message.toLowerCase().includes('abort'),
    `Expected abort/cancel error message, got: ${caughtError.message}`
  );
  console.log(`✓ Render cancellation cleanly caught: "${caughtError.message}"`);

  console.log('\n>>> ALL RENDER ADAPTER TESTS PASSED! <<<');
}

testRender().catch(err => {
  console.error('Test Render Failed:', err);
  process.exit(1);
});

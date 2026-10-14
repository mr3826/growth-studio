import { createBlankProject } from '../packages/contracts/src/index.js';
import { compileComposition } from '../packages/template-engine/src/index.js';
import { renderVideo, probeMedia } from '../packages/render-adapter/src/index.js';
import path from 'node:path';
import fs from 'node:fs';

async function testRender() {
  console.log('--- Starting Test Render ---');
  const project = createBlankProject('Test Render Promo');
  // Shorten scene durations for quick test
  project.scenes = [
    {
      id: 'test-hook',
      kind: 'kinetic_text',
      durationSeconds: 2,
      headline: 'Kinetic Studio',
      subheadline: 'Offline Video Generator',
      highlightWords: ['Kinetic'],
      motion: { entrance: 'stagger_words', exit: 'fade' }
    }
  ];

  const targetId = 'portrait';
  const comp = compileComposition({ project, targetId });
  const outputPath = path.resolve('data/exports/test-render-portrait.mp4');

  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  console.log(`Compiling ${comp.totalFrames} frames (${comp.totalDuration}s) at ${comp.target.width}x${comp.target.height}`);

  const result = await renderVideo({
    compositionHtml: comp.html,
    target: comp.target,
    totalFrames: comp.totalFrames,
    totalDuration: comp.totalDuration,
    outputPath,
    onProgress: (p) => {
      if (p.currentFrame % 15 === 0 || p.currentFrame === p.totalFrames) {
        console.log(`Rendering progress: ${p.percent}% (${p.currentFrame}/${p.totalFrames})`);
      }
    }
  });

  console.log('Render Result:', result);
  const probe = await probeMedia(outputPath);
  console.log('Probe Verification:', {
    width: probe.width,
    height: probe.height,
    duration: probe.duration,
    fps: probe.fps,
    videoCodec: probe.videoCodec,
    audioCodec: probe.audioCodec,
    fileSize: probe.fileSize
  });

  if (probe.width !== 1080 || probe.height !== 1920) {
    throw new Error(`Dimensions mismatch: expected 1080x1920, got ${probe.width}x${probe.height}`);
  }
  if (probe.videoCodec !== 'h264') {
    throw new Error(`Codec mismatch: expected h264, got ${probe.videoCodec}`);
  }
  console.log('>>> TEST RENDER SUCCEEDED! Valid 1080x1920 MP4 created and verified. <<<');
}

testRender().catch(err => {
  console.error('Test Render Failed:', err);
  process.exit(1);
});

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('docs/quality/inspections');
fs.mkdirSync(outDir, { recursive: true });

const exportsDir = 'E:/GrowthStudio/exports';
const targets = [
  { file: 'matrix-a-easymoderator-16x9.mp4', label: 'landscape-16x9', timestamps: ['00:00:02', '00:00:06', '00:00:11'] },
  { file: 'matrix-b-easymoderator-9x16.mp4', label: 'portrait-9x16', timestamps: ['00:00:02', '00:00:06', '00:00:10'] }
];

console.log('=== EXTRACTING KEY FRAMES FOR VISUAL & BRANDING AUDIT ===\n');

for (const target of targets) {
  const videoPath = path.join(exportsDir, target.file);
  if (!fs.existsSync(videoPath)) {
    console.error(`Not found: ${videoPath}`);
    continue;
  }
  for (let i = 0; i < target.timestamps.length; i++) {
    const ts = target.timestamps[i];
    const frameName = `${target.label}-scene${i + 1}-${ts.replace(/:/g, '')}.png`;
    const outPath = path.join(outDir, frameName);
    execFileSync('ffmpeg', [
      '-y',
      '-ss', ts,
      '-i', videoPath,
      '-vframes', '1',
      outPath
    ], { stdio: 'pipe' });
    const stat = fs.statSync(outPath);
    console.log(`Extracted: ${frameName} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

console.log('\nAll frames extracted successfully to:', outDir);

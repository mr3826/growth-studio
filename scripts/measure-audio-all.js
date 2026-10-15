import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const exportsDir = 'E:/GrowthStudio/exports';
const videos = [
  'matrix-a-easymoderator-16x9.mp4',
  'matrix-b-easymoderator-9x16.mp4',
  'matrix-c-generic-brand-4x5.mp4',
  'matrix-d-offline-reexport.mp4',
  'matrix-e-manual-no-key.mp4',
  'matrix-f-selective-regen.mp4'
];

console.log('=== AUDIO QUALITY & EBU R128 LOUDNESS MEASUREMENT REPORT ===\n');

const results = [];

for (const video of videos) {
  const filePath = path.join(exportsDir, video);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing video: ${filePath}`);
    continue;
  }

  // 1. Check audio streams with ffprobe
  const probeOutput = execFileSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a',
    '-show_entries', 'stream=codec_name,sample_rate,channels:format=duration',
    '-of', 'json',
    filePath
  ], { encoding: 'utf8' });
  const probeData = JSON.parse(probeOutput);
  const hasAudio = probeData.streams && probeData.streams.length > 0;
  const duration = parseFloat(probeData.format?.duration || 0);

  if (!hasAudio) {
    results.push({
      video,
      hasAudio: false,
      integratedLufs: 'N/A (silent)',
      lra: 'N/A',
      truePeak: 'N/A',
      meanVolume: 'N/A',
      maxVolume: 'N/A',
      durationSec: duration.toFixed(2),
      status: 'INTENTIONAL_SILENT'
    });
    continue;
  }

  // 2. Measure EBU R128 Loudness (Integrated LUFS, LRA, True Peak)
  let ebur128Output = '';
  try {
    ebur128Output = execFileSync('ffmpeg', [
      '-hide_banner',
      '-nostats',
      '-i', filePath,
      '-filter_complex', 'ebur128=peak=true',
      '-f', 'null',
      '-'
    ], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    ebur128Output = err.stderr || err.stdout || '';
  }

  const iMatch = ebur128Output.match(/Integrated loudness:\s+I:\s+([-\d.]+)\s+LUFS/);
  const lraMatch = ebur128Output.match(/Loudness range:\s+LRA:\s+([-\d.]+)\s+LU/);
  const peakMatch = ebur128Output.match(/True peak:\s+Peak:\s+([-\d.]+)\s+dBFS/);

  // 3. Volumedetect
  let volumeOutput = '';
  try {
    volumeOutput = execFileSync('ffmpeg', [
      '-hide_banner',
      '-nostats',
      '-i', filePath,
      '-af', 'volumedetect',
      '-f', 'null',
      '-'
    ], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    volumeOutput = err.stderr || err.stdout || '';
  }

  const meanVolMatch = volumeOutput.match(/mean_volume:\s+([-\d.]+)\s+dB/);
  const maxVolMatch = volumeOutput.match(/max_volume:\s+([-\d.]+)\s+dB/);

  // 4. Silencedetect (-40dB, 0.5s)
  let silenceOutput = '';
  try {
    silenceOutput = execFileSync('ffmpeg', [
      '-hide_banner',
      '-nostats',
      '-i', filePath,
      '-af', 'silencedetect=noise=-40dB:d=0.5',
      '-f', 'null',
      '-'
    ], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    silenceOutput = err.stderr || err.stdout || '';
  }
  const silenceStarts = (silenceOutput.match(/silence_start/g) || []).length;

  results.push({
    video,
    hasAudio: true,
    integratedLufs: iMatch ? `${parseFloat(iMatch[1]).toFixed(1)} LUFS` : 'Unknown',
    lra: lraMatch ? `${parseFloat(lraMatch[1]).toFixed(1)} LU` : 'Unknown',
    truePeak: peakMatch ? `${parseFloat(peakMatch[1]).toFixed(1)} dBFS` : 'Unknown',
    meanVolume: meanVolMatch ? `${parseFloat(meanVolMatch[1]).toFixed(1)} dB` : 'Unknown',
    maxVolume: maxVolMatch ? `${parseFloat(maxVolMatch[1]).toFixed(1)} dB` : 'Unknown',
    silenceIntervals: silenceStarts,
    durationSec: duration.toFixed(2),
    status: 'MEASURED'
  });
}

console.table(results);

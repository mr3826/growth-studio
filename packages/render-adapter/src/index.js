import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function getChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No local Chrome or Chromium installation found.');
}

export function probeMedia(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_format',
      '-show_streams',
      '-print_format', 'json',
      filePath
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', data => { stdout += data.toString(); });
    ffprobe.stderr.on('data', data => { stderr += data.toString(); });

    ffprobe.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
      }
      try {
        const info = JSON.parse(stdout);
        const videoStream = (info.streams || []).find(s => s.codec_type === 'video');
        const audioStream = (info.streams || []).find(s => s.codec_type === 'audio');

        let fps = 30;
        if (videoStream?.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          if (den) fps = Math.round(num / den);
        }

        resolve({
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          duration: Number(info.format?.duration || videoStream?.duration || 0),
          fps,
          videoCodec: videoStream?.codec_name || 'unknown',
          audioCodec: audioStream?.codec_name || 'unknown',
          frameCount: Number(videoStream?.nb_frames || 0),
          fileSize: Number(info.format?.size || 0),
          raw: info
        });
      } catch (e) {
        reject(e);
      }
    });

    ffprobe.on('error', reject);
  });
}

export async function renderVideo({
  compositionHtml,
  target,
  totalFrames,
  totalDuration,
  outputPath,
  audioPath = null,
  audioConfig = {},
  onProgress = () => {}
}) {
  const width = target.width;
  const height = target.height;
  const fps = target.fps || 30;

  const chromePath = getChromePath();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-render-'));
  const tempHtmlPath = path.join(tempDir, 'composition.html');
  fs.writeFileSync(tempHtmlPath, compositionHtml, 'utf8');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--mute-audio',
      '--disable-background-networking',
      '--disable-sync',
      '--no-default-browser-check',
      `--window-size=${width},${height}`
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  // Load the composition HTML locally
  await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__READY_FOR_RENDER__ === true, { timeout: 10000 });

  // Prepare FFmpeg command
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-r', String(fps),
    '-i', '-'
  ];

  const hasAudio = audioPath && fs.existsSync(audioPath);
  if (hasAudio) {
    const vol = audioConfig.musicVolume ?? 0.3;
    const fadeIn = audioConfig.fadeInSeconds || 0.4;
    const fadeOut = audioConfig.fadeOutSeconds || 0.8;
    const fadeOutStart = Math.max(0, totalDuration - fadeOut);

    ffmpegArgs.push(
      '-i', audioPath,
      '-filter_complex', `[1:a]atrim=0:${totalDuration},volume=${vol},afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}[a]`,
      '-map', '0:v',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'faster',
      '-crf', '19',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath
    );
  } else {
    // Generate silent stereo audio track so output is 100% compliant MP4 with h264+aac
    ffmpegArgs.push(
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'faster',
      '-crf', '19',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      '-movflags', '+faststart',
      outputPath
    );
  }

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  let ffmpegStderr = '';
  ffmpeg.stderr.on('data', data => {
    ffmpegStderr += data.toString();
  });

  const ffmpegDonePromise = new Promise((resolve, reject) => {
    ffmpeg.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed with exit code ${code}: ${ffmpegStderr}`));
    });
    ffmpeg.on('error', reject);
  });

  // Render loop
  try {
    for (let f = 0; f < totalFrames; f++) {
      await page.evaluate(frameIndex => {
        window.seekToFrame(frameIndex);
      }, f);

      const frameBuffer = await page.screenshot({
        type: 'png',
        optimizeForSpeed: true
      });

      const canWrite = ffmpeg.stdin.write(frameBuffer);
      if (!canWrite) {
        await new Promise(r => ffmpeg.stdin.once('drain', r));
      }

      const percent = Math.round(((f + 1) / totalFrames) * 100);
      onProgress({
        currentFrame: f + 1,
        totalFrames,
        percent,
        time: (f / fps).toFixed(2),
        totalDuration: totalDuration.toFixed(2)
      });
    }

    ffmpeg.stdin.end();
    await ffmpegDonePromise;
  } finally {
    await browser.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }

  // Probe output video to verify file properties
  const probeResult = await probeMedia(outputPath);

  return {
    success: true,
    outputPath,
    metadata: probeResult
  };
}

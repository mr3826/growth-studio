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

/**
 * Robustly kills a child process tree on Windows and Unix.
 */
export function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    try {
      const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F']);
      killer.unref();
    } catch (_) {}
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (_) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (_) {}
    }
  }
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

/**
 * Measure audio volume levels (mean and max dB) using ffmpeg volumedetect.
 */
export function measureAudioVolume(filePath) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-i', filePath, '-af', 'volumedetect', '-f', 'null', '-']);
    let stderr = '';
    ff.stderr.on('data', d => { stderr += d.toString(); });
    ff.on('close', code => {
      if (code !== 0) return reject(new Error(`volumedetect failed: ${stderr}`));
      const meanMatch = stderr.match(/mean_volume:\s*([-0-9.]+)\s*dB/);
      const maxMatch = stderr.match(/max_volume:\s*([-0-9.]+)\s*dB/);
      const meanVolumeDb = meanMatch ? parseFloat(meanMatch[1]) : -91.0;
      const maxVolumeDb = maxMatch ? parseFloat(maxMatch[1]) : -91.0;
      const isSilent = meanVolumeDb <= -80 && maxVolumeDb <= -80;
      resolve({ meanVolumeDb, maxVolumeDb, isSilent });
    });
    ff.on('error', reject);
  });
}

/**
 * Detect silence intervals using ffmpeg silencedetect.
 */
export function detectSilence(filePath, noiseDb = -55, minDuration = 0.5) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-i', filePath,
      '-af', `silencedetect=noise=${noiseDb}dB:d=${minDuration}`,
      '-f', 'null', '-'
    ]);
    let stderr = '';
    ff.stderr.on('data', d => { stderr += d.toString(); });
    ff.on('close', code => {
      if (code !== 0) return reject(new Error(`silencedetect failed: ${stderr}`));
      const silenceIntervals = [];
      const startRegex = /silence_start:\s*([0-9.]+)/g;
      const endRegex = /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/g;
      const starts = [];
      let m;
      while ((m = startRegex.exec(stderr)) !== null) {
        starts.push(parseFloat(m[1]));
      }
      let i = 0;
      while ((m = endRegex.exec(stderr)) !== null) {
        const start = starts[i] !== undefined ? starts[i] : 0;
        const end = parseFloat(m[1]);
        const duration = parseFloat(m[2]);
        silenceIntervals.push({ start, end, duration });
        i++;
      }
      resolve({ silenceIntervals, hasSilence: silenceIntervals.length > 0 });
    });
    ff.on('error', reject);
  });
}

export async function renderVideo({
  compositionHtml,
  target,
  totalFrames,
  totalDuration,
  outputPath,
  audioTracks = [],
  audioPath = null,
  audioConfig = {},
  tempParentDir = null,
  signal = null,
  frameFormat = 'png',
  onProgress = () => {}
}) {
  const width = target.width;
  const height = target.height;
  const fps = target.fps || 30;

  // Determine scratch directory: prefer E:\GrowthStudio\renders on Windows, never default to C: temp if E: exists
  let rendersRoot = tempParentDir;
  if (!rendersRoot) {
    if (process.platform === 'win32' && fs.existsSync('E:\\GrowthStudio')) {
      rendersRoot = 'E:\\GrowthStudio\\renders';
    } else {
      rendersRoot = os.tmpdir();
    }
  }

  if (!fs.existsSync(rendersRoot)) {
    fs.mkdirSync(rendersRoot, { recursive: true });
  }

  const chromePath = getChromePath();
  const tempDir = fs.mkdtempSync(path.join(rendersRoot, 'kinetic-render-'));
  const tempHtmlPath = path.join(tempDir, 'composition.html');
  fs.writeFileSync(tempHtmlPath, compositionHtml, 'utf8');

  // Launch local headless Chromium
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

  // Load composition HTML
  await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__READY_FOR_RENDER__ === true, { timeout: 15000 });

  const isJpeg = frameFormat === 'jpeg' || frameFormat === 'jpg';

  // Prepare FFmpeg command
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', isJpeg ? 'mjpeg' : 'png',
    '-r', String(fps),
    '-i', '-'
  ];

  const isExplicitSilent = audioConfig.mode === 'silent' || audioConfig.muteAll === true;
  const allClips = [...(audioTracks || [])];
  if (audioPath && fs.existsSync(audioPath) && !allClips.some(c => c.path === audioPath)) {
    allClips.push({
      type: 'music',
      path: audioPath,
      volume: audioConfig.musicVolume ?? 0.25,
      fadeInSeconds: audioConfig.fadeInSeconds || 0.4,
      fadeOutSeconds: audioConfig.fadeOutSeconds || 0.8
    });
  }

  const validClips = allClips.filter(c => c && c.path && fs.existsSync(c.path));

  // If active audio mode was explicitly specified but no clips exist, throw an actionable error
  if (!isExplicitSilent && audioConfig.mode && audioConfig.mode !== 'silent' && validClips.length === 0) {
    throw new Error(`Render failed: Audio mode "${audioConfig.mode}" requested, but no valid audio tracks or narration clips were provided.`);
  }

  const voiceClips = [];
  let musicClip = null;

  if (!isExplicitSilent && validClips.length > 0) {
    for (const clip of validClips) {
      if (clip.type === 'music') {
        musicClip = clip;
      } else {
        voiceClips.push(clip);
      }
    }
  }

  // FFmpeg inputs & filter construction
  if (isExplicitSilent || (voiceClips.length === 0 && !musicClip)) {
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
  } else {
    // Add audio inputs and construct filter graph
    const filterSegments = [];
    let nextStreamIdx = 1;

    // Add voice inputs
    const voiceStreamLabels = [];
    for (const vClip of voiceClips) {
      ffmpegArgs.push('-i', vClip.path);
      const streamIdx = nextStreamIdx++;
      const delayMs = Math.max(0, Math.round((vClip.startTime || 0) * 1000));
      const vol = vClip.volume ?? (audioConfig.voiceVolume ?? 1.0);
      const label = `v_${streamIdx}`;
      filterSegments.push(`[${streamIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,adelay=${delayMs}|${delayMs},volume=${vol}[${label}]`);
      voiceStreamLabels.push(`[${label}]`);
    }

    let musicStreamLabel = null;
    if (musicClip) {
      ffmpegArgs.push('-i', musicClip.path);
      const streamIdx = nextStreamIdx++;
      const musicVol = musicClip.volume ?? (audioConfig.musicVolume ?? 0.25);
      const fadeIn = musicClip.fadeInSeconds || audioConfig.fadeInSeconds || 0.4;
      const fadeOut = musicClip.fadeOutSeconds || audioConfig.fadeOutSeconds || 0.8;
      const fadeOutStart = Math.max(0, totalDuration - fadeOut);
      musicStreamLabel = `m_${streamIdx}`;
      filterSegments.push(`[${streamIdx}:a]aloop=loop=-1:size=2e+09,atrim=0:${totalDuration},volume=${musicVol},afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}[${musicStreamLabel}]`);
    }

    let finalAudioLabel = 'aout';
    const targetLufs = audioConfig.targetLufs || -16;

    if (voiceStreamLabels.length > 0 && musicStreamLabel) {
      // Merge voice streams if multiple
      let voiceMasterLabel = voiceStreamLabels[0];
      if (voiceStreamLabels.length > 1) {
        voiceMasterLabel = '[voice_master]';
        filterSegments.push(`${voiceStreamLabels.join('')}amix=inputs=${voiceStreamLabels.length}:duration=longest:dropout_transition=0:normalize=0${voiceMasterLabel}`);
      }

      // Ducking: compress music when voice is active
      const doDucking = audioConfig.ducking !== false;
      if (doDucking) {
        filterSegments.push(`${voiceMasterLabel}asplit=2[vm_sc][vm_mix]`);
        filterSegments.push(`[${musicStreamLabel}][vm_sc]sidechaincompress=threshold=0.08:ratio=4:attack=50:release=350[ducked_music]`);
        filterSegments.push(`[ducked_music][vm_mix]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,atrim=0:${totalDuration},loudnorm=I=${targetLufs}:TP=-1.5:LRA=11[${finalAudioLabel}]`);
      } else {
        filterSegments.push(`[${musicStreamLabel}]${voiceMasterLabel}amix=inputs=2:duration=first:dropout_transition=0:normalize=0,atrim=0:${totalDuration},loudnorm=I=${targetLufs}:TP=-1.5:LRA=11[${finalAudioLabel}]`);
      }
    } else if (voiceStreamLabels.length > 0) {
      // Voice only
      if (voiceStreamLabels.length > 1) {
        filterSegments.push(`${voiceStreamLabels.join('')}amix=inputs=${voiceStreamLabels.length}:duration=longest:dropout_transition=0:normalize=0,atrim=0:${totalDuration},loudnorm=I=${targetLufs}:TP=-1.5:LRA=11[${finalAudioLabel}]`);
      } else {
        filterSegments.push(`${voiceStreamLabels[0]}atrim=0:${totalDuration},loudnorm=I=${targetLufs}:TP=-1.5:LRA=11[${finalAudioLabel}]`);
      }
    } else if (musicStreamLabel) {
      // Music only
      filterSegments.push(`[${musicStreamLabel}]atrim=0:${totalDuration},loudnorm=I=${targetLufs}:TP=-1.5:LRA=11[${finalAudioLabel}]`);
    }

    const filterComplex = filterSegments.join(';');
    ffmpegArgs.push(
      '-filter_complex', filterComplex,
      '-map', '0:v',
      '-map', `[${finalAudioLabel}]`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'faster',
      '-crf', '19',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath
    );
  }

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);
  ffmpeg.stdin.on('error', () => {});

  let ffmpegStderr = '';
  ffmpeg.stderr.on('data', data => {
    ffmpegStderr += data.toString();
  });

  let ffmpegDone = false;
  let ffmpegError = null;

  const ffmpegDonePromise = new Promise((resolve, reject) => {
    ffmpeg.on('close', code => {
      ffmpegDone = true;
      if (code === 0 || isCancelled || signal?.aborted) resolve();
      else reject(new Error(`FFmpeg failed with exit code ${code}: ${ffmpegStderr}`));
    });
    ffmpeg.on('error', err => {
      ffmpegError = err;
      if (isCancelled || signal?.aborted) resolve();
      else reject(err);
    });
  });

  // Handle cancellation signal
  let isCancelled = false;
  const abortHandler = () => {
    isCancelled = true;
    killProcessTree(ffmpeg.pid);
    try { ffmpeg.stdin.destroy(); } catch (_) {}
    try { browser.close(); } catch (_) {}
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch (_) {}
    }
  };

  if (signal) {
    if (signal.aborted) {
      abortHandler();
      const err = new Error('Render cancelled prior to start');
      err.name = 'AbortError';
      throw err;
    }
    signal.addEventListener('abort', abortHandler, { once: true });
  }

  // Render loop
  try {
    for (let f = 0; f < totalFrames; f++) {
      if (isCancelled || signal?.aborted) {
        const err = new Error('Render job cancelled by user');
        err.name = 'AbortError';
        throw err;
      }

      await page.evaluate(frameIndex => {
        window.seekToFrame(frameIndex);
      }, f);

      const frameBuffer = await page.screenshot(
        isJpeg ? { type: 'jpeg', quality: 92 } : { type: 'png', optimizeForSpeed: true }
      );

      if (isCancelled || signal?.aborted) {
        const err = new Error('Render job cancelled by user');
        err.name = 'AbortError';
        throw err;
      }

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
  } catch (err) {
    killProcessTree(ffmpeg.pid);
    if (fs.existsSync(outputPath) && (isCancelled || signal?.aborted)) {
      try { fs.unlinkSync(outputPath); } catch (_) {}
    }
    if (isCancelled || signal?.aborted) {
      const cancelErr = new Error('Render job cancelled by user');
      cancelErr.name = 'AbortError';
      throw cancelErr;
    }
    throw err;
  } finally {
    if (signal) {
      signal.removeEventListener('abort', abortHandler);
    }
    try {
      await browser.close();
    } catch (_) {}
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }

  // Probe output video to verify file properties
  const probeResult = await probeMedia(outputPath);
  const volumeMetrics = await measureAudioVolume(outputPath);
  const silenceMetrics = await detectSilence(outputPath);

  // If audio was expected, enforce audibility
  const audioExpected = !isExplicitSilent && (voiceClips.length > 0 || musicClip !== null);
  if (audioExpected && volumeMetrics.isSilent) {
    throw new Error(`Render validation failed: Audio output is silent (mean: ${volumeMetrics.meanVolumeDb} dB, max: ${volumeMetrics.maxVolumeDb} dB). Expected audible sound.`);
  }

  return {
    success: true,
    outputPath,
    metadata: probeResult,
    audioMetrics: {
      volume: volumeMetrics,
      silence: silenceMetrics
    }
  };
}

export {
  pcmToWav,
  GEMINI_TTS_MODEL,
  GEMINI_TTS_VOICES,
  isGeminiTtsAvailable,
  synthesizeSpeechGemini
} from './tts.js';


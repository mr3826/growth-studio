import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root path to templates directory
const templatesDir = path.resolve(__dirname, '../../../templates');

export function listTemplates() {
  const result = [];
  if (fs.existsSync(templatesDir)) {
    const entries = fs.readdirSync(templatesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(templatesDir, entry.name, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            result.push(manifest);
          } catch (e) {
            console.error(`Failed to load manifest for template ${entry.name}:`, e);
          }
        }
      }
    }
  }
  return result;
}

export function getTemplate(id) {
  const templates = listTemplates();
  return templates.find(t => t.id === id) || null;
}

export function calculateTimeline(scenes) {
  let currentTime = 0;
  const timedScenes = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const duration = Math.max(1, Number(s.durationSeconds) || 4);
    const transition = s.transitionDurationSeconds || 0;
    const startTime = currentTime;
    const endTime = startTime + duration;
    timedScenes.push({
      ...s,
      durationSeconds: duration,
      startTime,
      endTime
    });
    // overlap for next scene if transition exists
    currentTime = endTime - (i < scenes.length - 1 ? Math.min(transition, duration * 0.5) : 0);
  }
  const totalDuration = currentTime;
  return {
    timedScenes,
    totalDuration: Math.max(1, totalDuration)
  };
}

export function runPreflight(project) {
  const errors = [];
  const warnings = [];

  if (!project.project?.name?.trim()) {
    errors.push('Project name is required.');
  }

  if (!project.creative?.keyMessage?.trim()) {
    errors.push('Creative key message is required.');
  }

  if (!project.scenes || project.scenes.length === 0) {
    errors.push('At least one scene is required in the timeline.');
  } else {
    project.scenes.forEach((scene, index) => {
      if (!scene.headline?.trim() && !scene.subheadline?.trim() && !scene.ctaLabel?.trim()) {
        warnings.push(`Scene #${index + 1} (${scene.id || 'unnamed'}) has no text content.`);
      }
      if (scene.mediaAssetIds && scene.mediaAssetIds.length > 0) {
        scene.mediaAssetIds.forEach(assetId => {
          const found = (project.assets || []).some(a => a.id === assetId);
          if (!found) {
            warnings.push(`Scene #${index + 1} references asset "${assetId}", which is not imported.`);
          }
        });
      }
    });
  }

  const { totalDuration } = calculateTimeline(project.scenes || []);
  if (totalDuration < 2) {
    warnings.push(`Total video duration is very short (${totalDuration.toFixed(1)}s).`);
  }
  if (totalDuration > 120) {
    errors.push(`Total video duration exceeds maximum 120s limit (${totalDuration.toFixed(1)}s).`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    totalDuration
  };
}

export function compileComposition({ project, targetId = 'portrait', assetBaseUrl = '' }) {
  const target = (project.targets || []).find(t => t.id === targetId) || {
    id: targetId,
    width: targetId === 'landscape' ? 1920 : 1080,
    height: targetId === 'landscape' ? 1080 : 1920,
    fps: 30,
    safeMarginPercent: targetId === 'landscape' ? 7 : 9,
    fitMode: 'reflow'
  };

  const isPortrait = target.width < target.height;
  const fps = target.fps || 30;
  const brand = project.brand || {};
  const primaryColor = brand.primaryColor || '#7460D9';
  const backgroundColor = brand.backgroundColor || '#17223B';
  const textColor = brand.textColor || '#FFFFFF';
  const accentColor = brand.accentColor || '#F4C35E';
  const latinFont = brand.latinFontFamily || 'Inter, system-ui, -apple-system, sans-serif';
  const cornerRadius = brand.cornerRadiusPx ?? 16;

  const { timedScenes, totalDuration } = calculateTimeline(project.scenes || []);
  const totalFrames = Math.max(1, Math.round(totalDuration * fps));

  // Build asset lookup map
  const assetMap = {};
  for (const a of (project.assets || [])) {
    assetMap[a.id] = a.file ? `${assetBaseUrl}${a.file}` : '';
  }

  // Pre-generate scene elements
  const sceneElementsHtml = timedScenes.map((s, idx) => {
    const entrance = s.motion?.entrance || 'stagger_words';
    const exit = s.motion?.exit || 'fade';
    const easing = s.motion?.easing || 'spring';
    const staggerMs = s.motion?.staggerMilliseconds || 70;
    const highlightWords = (s.highlightWords || []).map(w => w.toLowerCase());

    const words = (s.headline || '').split(' ').map((word, wIdx) => {
      const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase();
      const isHighlighted = highlightWords.includes(cleanWord);
      const spanClass = isHighlighted ? 'kinetic-word highlighted' : 'kinetic-word';
      return `<span class="${spanClass}" data-word-index="${wIdx}">${escapeHtml(word)}</span>`;
    }).join(' ');

    const mediaId = (s.mediaAssetIds && s.mediaAssetIds[0]) ? s.mediaAssetIds[0] : null;
    const mediaUrl = mediaId ? assetMap[mediaId] : null;

    let mediaBlock = '';
    if (s.kind === 'ui_demo') {
      mediaBlock = `
        <div class="device-mockup-container ${s.deviceFrame || 'browser_window'}">
          <div class="mockup-header">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
            <span class="mockup-url-bar">${escapeHtml(project.creative?.cta?.destination || 'app.easymoderator.com')}</span>
          </div>
          <div class="mockup-viewport">
            ${mediaUrl ? `<img src="${mediaUrl}" class="mockup-screen-img" alt="UI Screenshot" />` : `
              <div class="mockup-placeholder">
                <div class="ph-header">EasyModerator Smart Inbox</div>
                <div class="ph-row active"><div class="ph-avatar"></div><div class="ph-lines"><span></span><span></span></div></div>
                <div class="ph-row"><div class="ph-avatar"></div><div class="ph-lines"><span></span><span></span></div></div>
                <div class="ph-row"><div class="ph-avatar"></div><div class="ph-lines"><span></span><span></span></div></div>
              </div>
            `}
          </div>
        </div>
      `;
    } else if (mediaUrl) {
      mediaBlock = `
        <div class="scene-media-wrapper">
          <img src="${mediaUrl}" class="scene-inline-media" alt="Media" />
        </div>
      `;
    }

    let ctaBlock = '';
    if (s.kind === 'cta' || s.ctaLabel) {
      const label = s.ctaLabel || project.creative?.cta?.label || 'Get Started';
      const dest = s.ctaDestination || project.creative?.cta?.destination || '';
      ctaBlock = `
        <div class="scene-cta-container">
          <div class="cta-button">
            <span>${escapeHtml(label)}</span>
            <svg class="cta-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          ${dest ? `<div class="cta-destination">${escapeHtml(dest)}</div>` : ''}
        </div>
      `;
    }

    return `
      <section class="scene-card" id="scene-${idx}" data-scene-id="${s.id}" data-start-time="${s.startTime}" data-end-time="${s.endTime}" data-duration="${s.durationSeconds}" data-entrance="${entrance}" data-exit="${exit}" data-easing="${easing}" data-stagger="${staggerMs}">
        <div class="scene-content">
          ${s.eyebrow ? `<div class="scene-eyebrow">${escapeHtml(s.eyebrow)}</div>` : ''}
          ${s.headline ? `<h1 class="scene-headline">${words}</h1>` : ''}
          ${s.subheadline ? `<div class="scene-subheadline">${escapeHtml(s.subheadline)}</div>` : ''}
          ${s.body ? `<div class="scene-body">${escapeHtml(s.body)}</div>` : ''}
          ${mediaBlock}
          ${ctaBlock}
        </div>
      </section>
    `;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${target.width}, height=${target.height}, initial-scale=1.0">
  <title>${escapeHtml(project.project?.name || 'Kinetic Studio Video')}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --target-w: ${target.width}px;
      --target-h: ${target.height}px;
      --safe-margin: ${target.safeMarginPercent || (isPortrait ? 9 : 7)}%;
      --primary: ${primaryColor};
      --bg: ${backgroundColor};
      --text: ${textColor};
      --accent: ${accentColor};
      --font-family: ${latinFont};
      --radius: ${cornerRadius}px;
      --scale-factor: ${isPortrait ? (target.width / 1080) : (target.height / 1080)};
    }

    html, body {
      width: ${target.width}px;
      height: ${target.height}px;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-family);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      user-select: none;
    }

    #stage {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 30%, rgba(116, 96, 217, 0.28) 0%, rgba(23, 34, 59, 0) 70%), var(--bg);
    }

    /* Ambient background floating orbs */
    .ambient-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
      opacity: 0.45;
      z-index: 1;
    }
    .glow-1 {
      width: calc(600px * var(--scale-factor));
      height: calc(600px * var(--scale-factor));
      background: var(--primary);
      top: -10%;
      right: -10%;
    }
    .glow-2 {
      width: calc(500px * var(--scale-factor));
      height: calc(500px * var(--scale-factor));
      background: var(--accent);
      bottom: -10%;
      left: -10%;
      opacity: 0.25;
    }

    /* Safe Area Guides (Optional visual overlay) */
    #safe-area-overlay {
      position: absolute;
      top: var(--safe-margin);
      bottom: var(--safe-margin);
      left: var(--safe-margin);
      right: var(--safe-margin);
      border: 2px dashed rgba(244, 195, 94, 0.4);
      pointer-events: none;
      z-index: 999;
      display: none;
    }
    body.show-safe-area #safe-area-overlay {
      display: block;
    }

    /* Brand Watermark / Badge */
    .brand-pill {
      position: absolute;
      top: calc(var(--safe-margin) + 12px);
      left: calc(var(--safe-margin) + 12px);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 100px;
      font-size: calc(18px * var(--scale-factor));
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.9);
      z-index: 20;
    }
    .brand-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px var(--accent);
    }

    /* Scene Container */
    .scene-card {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      padding: var(--safe-margin);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      z-index: 10;
      will-change: transform, opacity;
    }
    .scene-card.active {
      visibility: visible;
      pointer-events: auto;
    }

    .scene-content {
      position: relative;
      width: 100%;
      max-width: ${isPortrait ? '94%' : '80%'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: calc(24px * var(--scale-factor));
    }

    /* Eyebrow kicker */
    .scene-eyebrow {
      font-size: calc(22px * var(--scale-factor));
      font-weight: 800;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--accent);
      background: rgba(244, 195, 94, 0.12);
      border: 1px solid rgba(244, 195, 94, 0.3);
      padding: 6px 18px;
      border-radius: 100px;
    }

    /* Big Kinetic Headline */
    .scene-headline {
      font-size: calc(${isPortrait ? '68px' : '76px'} * var(--scale-factor));
      font-weight: 900;
      line-height: 1.1;
      letter-spacing: -0.03em;
      color: var(--text);
      display: inline-block;
      word-break: break-word;
    }

    .kinetic-word {
      display: inline-block;
      will-change: transform, opacity;
      margin: 0 calc(6px * var(--scale-factor));
    }

    .kinetic-word.highlighted {
      color: #17223B;
      background: var(--accent);
      padding: 2px 14px;
      border-radius: calc(var(--radius) * 0.7);
      box-shadow: 0 calc(6px * var(--scale-factor)) calc(20px * var(--scale-factor)) rgba(244, 195, 94, 0.35);
      transform-origin: center;
    }

    /* Subheadline */
    .scene-subheadline {
      font-size: calc(${isPortrait ? '32px' : '36px'} * var(--scale-factor));
      font-weight: 600;
      line-height: 1.35;
      color: rgba(255, 255, 255, 0.82);
      max-width: ${isPortrait ? '90%' : '75%'};
    }

    /* Body Text */
    .scene-body {
      font-size: calc(24px * var(--scale-factor));
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.68);
      max-width: 80%;
    }

    /* Media Wrapper */
    .scene-media-wrapper {
      margin-top: calc(16px * var(--scale-factor));
      max-width: 45%;
    }
    .scene-inline-media {
      max-height: calc(180px * var(--scale-factor));
      object-fit: contain;
      filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.4));
    }

    /* Device Mockup */
    .device-mockup-container {
      width: 100%;
      max-width: ${isPortrait ? '94%' : '65%'};
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: calc(var(--radius) * 1.2);
      overflow: hidden;
      box-shadow: 0 calc(20px * var(--scale-factor)) calc(50px * var(--scale-factor)) rgba(0, 0, 0, 0.6);
      margin-top: calc(12px * var(--scale-factor));
    }
    .mockup-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #0f172a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .mockup-header .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #eab308; }
    .dot-green { background: #22c55e; }
    .mockup-url-bar {
      margin-left: 12px;
      font-size: calc(13px * var(--scale-factor));
      color: rgba(255, 255, 255, 0.45);
      font-family: monospace;
    }
    .mockup-viewport {
      width: 100%;
      height: calc(${isPortrait ? '480px' : '420px'} * var(--scale-factor));
      background: #090d16;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .mockup-screen-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Mockup UI Placeholder */
    .mockup-placeholder {
      width: 90%;
      height: 85%;
      background: #111827;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ph-header {
      font-size: calc(16px * var(--scale-factor));
      font-weight: 700;
      color: var(--accent);
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 8px;
    }
    .ph-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
    }
    .ph-row.active {
      background: rgba(116, 96, 217, 0.15);
      border-left: 3px solid var(--primary);
    }
    .ph-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
    }
    .ph-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ph-lines span:first-child {
      height: 8px;
      width: 60%;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
    }
    .ph-lines span:last-child {
      height: 6px;
      width: 40%;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    /* Call To Action Container */
    .scene-cta-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: calc(16px * var(--scale-factor));
      margin-top: calc(20px * var(--scale-factor));
    }
    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      padding: calc(18px * var(--scale-factor)) calc(44px * var(--scale-factor));
      background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
      color: #ffffff;
      font-size: calc(30px * var(--scale-factor));
      font-weight: 800;
      border-radius: 100px;
      box-shadow: 0 calc(10px * var(--scale-factor)) calc(30px * var(--scale-factor)) rgba(116, 96, 217, 0.5);
    }
    .cta-arrow {
      width: calc(28px * var(--scale-factor));
      height: calc(28px * var(--scale-factor));
    }
    .cta-destination {
      font-size: calc(22px * var(--scale-factor));
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--accent);
      background: rgba(244, 195, 94, 0.1);
      padding: 6px 18px;
      border-radius: 100px;
      border: 1px solid rgba(244, 195, 94, 0.25);
    }
  </style>
</head>
<body>
  <div id="stage">
    <div class="ambient-glow glow-1"></div>
    <div class="ambient-glow glow-2"></div>
    <div id="safe-area-overlay"></div>

    <div class="brand-pill">
      <span class="brand-dot"></span>
      <span>${escapeHtml(brand.name || 'EasyModerator')}</span>
    </div>

    ${sceneElementsHtml}
  </div>

  <script>
    // Embedded Deterministic Animation Engine
    (function() {
      const fps = ${fps};
      const totalFrames = ${totalFrames};
      const totalDuration = ${totalDuration};

      const sceneData = ${JSON.stringify(timedScenes)};
      const scenes = Array.from(document.querySelectorAll('.scene-card'));

      // Easing functions
      function easeOutCubic(x) {
        return 1 - Math.pow(1 - x, 3);
      }
      function easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      }
      function easeOutBack(x) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
      }
      function easeSpring(x) {
        return easeOutBack(Math.min(1, Math.max(0, x)));
      }

      function clamp(val, min, max) {
        return Math.min(max, Math.max(min, val));
      }

      window.seekToTime = function(t) {
        const time = clamp(t, 0, totalDuration);

        // Find active scene(s)
        for (let i = 0; i < sceneData.length; i++) {
          const s = sceneData[i];
          const el = scenes[i];
          if (!el) continue;

          const startTime = s.startTime;
          const endTime = s.endTime;
          const duration = s.durationSeconds;
          const transition = s.transitionDurationSeconds || 0.3;

          const isCurrent = time >= startTime && time <= endTime;

          if (!isCurrent) {
            el.classList.remove('active');
            el.style.opacity = '0';
            el.style.transform = 'translateY(40px)';
            continue;
          }

          el.classList.add('active');

          const localTime = time - startTime;
          const entranceDuration = Math.min(1.2, duration * 0.35);
          const exitDuration = Math.min(0.6, duration * 0.25);
          const holdStart = entranceDuration;
          const holdEnd = duration - exitDuration;

          let opacity = 1;
          let translateY = 0;
          let scale = 1;

          // Entrance phase
          if (localTime < entranceDuration) {
            const rawProgress = clamp(localTime / entranceDuration, 0, 1);
            const easedProgress = s.motion?.easing === 'spring' ? easeSpring(rawProgress) : easeOutCubic(rawProgress);

            if (s.motion?.entrance === 'slide_left') {
              translateY = 0;
              el.style.transform = 'translateX(' + ((1 - easedProgress) * 120) + 'px)';
            } else if (s.motion?.entrance === 'scale_pop') {
              scale = 0.7 + (0.3 * easedProgress);
              el.style.transform = 'scale(' + scale + ')';
            } else {
              // fade_up or stagger_words
              translateY = (1 - easedProgress) * 50;
              el.style.transform = 'translateY(' + translateY + 'px)';
            }
            opacity = easedProgress;

            // Stagger individual words if stagger_words entrance
            const wordSpans = el.querySelectorAll('.kinetic-word');
            const staggerStep = (s.motion?.staggerMilliseconds || 70) / 1000;
            wordSpans.forEach((wSpan, wIdx) => {
              const wordStart = wIdx * staggerStep;
              const wordProgress = clamp((localTime - wordStart) / (entranceDuration * 0.6), 0, 1);
              const wordEased = easeSpring(wordProgress);
              wSpan.style.opacity = String(wordProgress);
              wSpan.style.transform = 'translateY(' + ((1 - wordEased) * 40) + 'px)';
            });
          }
          // Exit phase
          else if (localTime > holdEnd) {
            const exitProgress = clamp((localTime - holdEnd) / exitDuration, 0, 1);
            const exitEased = easeInOutCubic(exitProgress);
            opacity = 1 - exitEased;

            if (s.motion?.exit === 'slide_left') {
              el.style.transform = 'translateX(' + (-exitEased * 100) + 'px)';
            } else if (s.motion?.exit === 'zoom') {
              el.style.transform = 'scale(' + (1 + exitEased * 0.2) + ')';
            } else {
              el.style.transform = 'translateY(' + (-exitEased * 30) + 'px)';
            }
          }
          // Hold phase
          else {
            opacity = 1;
            const holdProgress = (localTime - holdStart) / (holdEnd - holdStart);
            scale = 1 + (Math.sin(holdProgress * Math.PI) * 0.02);
            el.style.transform = 'scale(' + scale + ')';

            const wordSpans = el.querySelectorAll('.kinetic-word');
            wordSpans.forEach(wSpan => {
              wSpan.style.opacity = '1';
              wSpan.style.transform = 'none';
            });
          }

          el.style.opacity = String(opacity);
        }

        window.__CURRENT_TIME__ = time;
        window.__CURRENT_FRAME__ = Math.round(time * fps);
      };

      window.seekToFrame = function(f) {
        const frame = clamp(f, 0, totalFrames - 1);
        const t = frame / fps;
        window.seekToTime(t);
        return frame;
      };

      // Playback Controls for Interactive Preview
      let isPlaying = false;
      let lastTimestamp = null;
      let currentTime = 0;

      function loop(timestamp) {
        if (!isPlaying) {
          lastTimestamp = null;
          return;
        }
        if (lastTimestamp === null) lastTimestamp = timestamp;
        const delta = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;

        currentTime += delta;
        if (currentTime >= totalDuration) {
          currentTime = 0; // loop
        }
        window.seekToTime(currentTime);

        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'KINETIC_TIMEUPDATE',
            currentTime: currentTime,
            totalDuration: totalDuration,
            frame: Math.round(currentTime * fps),
            totalFrames: totalFrames
          }, '*');
        }

        requestAnimationFrame(loop);
      }

      window.play = function() {
        if (!isPlaying) {
          isPlaying = true;
          requestAnimationFrame(loop);
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'KINETIC_PLAYING', isPlaying: true }, '*');
          }
        }
      };

      window.pause = function() {
        isPlaying = false;
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'KINETIC_PLAYING', isPlaying: false }, '*');
        }
      };

      window.togglePlay = function() {
        if (isPlaying) window.pause();
        else window.play();
      };

      window.addEventListener('message', function(ev) {
        if (!ev.data) return;
        if (ev.data.type === 'KINETIC_SEEK') {
          currentTime = clamp(ev.data.time, 0, totalDuration);
          window.seekToTime(currentTime);
        } else if (ev.data.type === 'KINETIC_PLAY') {
          window.play();
        } else if (ev.data.type === 'KINETIC_PAUSE') {
          window.pause();
        } else if (ev.data.type === 'KINETIC_TOGGLE') {
          window.togglePlay();
        } else if (ev.data.type === 'KINETIC_TOGGLE_SAFE_AREA') {
          document.body.classList.toggle('show-safe-area');
        }
      });

      // Initial seek to frame 0
      window.seekToFrame(0);

      // Mark ready for render
      window.__READY_FOR_RENDER__ = true;
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          window.__READY_FOR_RENDER__ = true;
        });
      }
    })();
  </script>
</body>
</html>`;

  return {
    html,
    target,
    totalDuration,
    totalFrames,
    fps,
    timedScenes
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

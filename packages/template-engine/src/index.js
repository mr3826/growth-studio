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
  // Support aliases for backward compatibility
  const canonicalId = id === 'problem_solution' ? 'guided_product_story' : (id === 'ui_showcase' ? 'app_showcase' : id);
  return templates.find(t => t.id === canonicalId || t.id === id) || null;
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
  
  // Support long-form walkthroughs up to 720s+ (>=12 minutes). Sanity limit is 30 minutes.
  if (totalDuration > 1800) {
    errors.push(`Total video duration exceeds maximum 1800s (30m) limit (${(totalDuration / 60).toFixed(1)}m).`);
  } else if (totalDuration > 720) {
    warnings.push(`Long-form video duration (${(totalDuration / 60).toFixed(1)}m). Please ensure adequate disk space on the target volume.`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    totalDuration
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

/**
 * Grapheme-safe tokenization of headlines into individual words,
 * matching highlight words for both English and Bengali scripts.
 */
function tokenizeHeadline(text, highlightWords = []) {
  if (!text) return '';
  const cleanHighlights = (highlightWords || []).map(w => w.trim().toLowerCase());

  // Split by whitespace preserving tokens
  const tokens = String(text).split(/(\s+)/);
  let wordIndex = 0;

  return tokens.map(token => {
    if (/^\s+$/.test(token)) return token;

    const cleanToken = token.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'–—]/g, '').toLowerCase();
    const isHighlighted = cleanHighlights.some(h => {
      if (!h) return false;
      return cleanToken === h || 
        (h.length >= 2 && cleanToken.includes(h)) ||
        (cleanToken.length >= 2 && h.includes(cleanToken));
    });

    const spanClass = isHighlighted ? 'kinetic-word highlighted' : 'kinetic-word';
    const span = `<span class="${spanClass}" data-word-index="${wordIndex}">${escapeHtml(token)}</span>`;
    wordIndex++;
    return span;
  }).join('');
}

export function compileComposition({ project, targetId = 'portrait', assetBaseUrl = '' }) {
  const defaultTargetConfigs = {
    portrait_4_5: {
      id: 'portrait_4_5',
      aspectRatio: '4:5',
      width: 1080,
      height: 1350,
      fps: 25,
      safeMarginPercent: 8,
      fitMode: 'reflow'
    },
    portrait: {
      id: 'portrait',
      aspectRatio: '9:16',
      width: 1080,
      height: 1920,
      fps: 30,
      safeMarginPercent: 9,
      fitMode: 'reflow'
    },
    landscape: {
      id: 'landscape',
      aspectRatio: '16:9',
      width: 1920,
      height: 1080,
      fps: 30,
      safeMarginPercent: 7,
      fitMode: 'reflow'
    },
    square: {
      id: 'square',
      aspectRatio: '1:1',
      width: 1080,
      height: 1080,
      fps: 30,
      safeMarginPercent: 8,
      fitMode: 'reflow'
    }
  };

  const targetRaw = (project.targets || []).find(t => t.id === targetId) ||
    defaultTargetConfigs[targetId] ||
    defaultTargetConfigs.portrait;

  const target = {
    ...targetRaw,
    aspectRatio: targetRaw.aspectRatio || (targetRaw.id === 'portrait_4_5' ? '4:5' : targetRaw.id === 'portrait' ? '9:16' : targetRaw.id === 'landscape' ? '16:9' : targetRaw.id === 'square' ? '1:1' : `${targetRaw.width}:${targetRaw.height}`)
  };

  const width = target.width;
  const height = target.height;
  const isPortrait = width <= height;
  const is4x5 = Math.abs((width / height) - (4 / 5)) < 0.05 || target.id === 'portrait_4_5';
  const fps = target.fps || (is4x5 ? 25 : 30);

  // Template archetype identification
  const templateId = (project.template?.id || 'bold_kinetic').toLowerCase();
  const isGuidedStory = templateId === 'guided_product_story' || templateId === 'problem_solution';
  const isAppShowcase = templateId === 'app_showcase' || templateId === 'ui_showcase';
  const isBoldKinetic = !isGuidedStory && !isAppShowcase;

  const brand = project.brand || {};
  
  // Theme color resolutions according to template archetype
  let primaryColor = brand.primaryColor;
  let backgroundColor = brand.backgroundColor;
  let textColor = brand.textColor;
  let accentColor = brand.accentColor;

  if (isGuidedStory) {
    primaryColor = primaryColor || '#18181B';
    backgroundColor = backgroundColor || '#F9F9F6'; // Warm editorial cream
    textColor = textColor || '#18181B';             // High-contrast near black
    accentColor = accentColor || '#CCFF00';         // Vivid lime highlight
  } else if (isAppShowcase) {
    primaryColor = primaryColor || '#0284C7';
    backgroundColor = backgroundColor || '#0A0F1D'; // Modern navy
    textColor = textColor || '#FFFFFF';
    accentColor = accentColor || '#38BDF8';         // Sky cyan
  } else {
    // Bold Kinetic
    primaryColor = primaryColor || '#7460D9';
    backgroundColor = backgroundColor || '#17223B'; // Deep space dark
    textColor = textColor || '#FFFFFF';
    accentColor = accentColor || '#F4C35E';         // Vibrant gold
  }

  const latinFont = brand.latinFontFamily || 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const banglaFont = brand.banglaFontFamily || '"Nirmala UI", "Noto Sans Bengali", Kalpurush, sans-serif';
  const combinedFontStack = `${latinFont}, ${banglaFont}`;
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
    const entrance = s.motion?.entrance || (isGuidedStory ? 'stagger_words' : 'fade_up');
    const exit = s.motion?.exit || 'fade';
    const easing = s.motion?.easing || 'spring';
    const staggerMs = s.motion?.staggerMilliseconds || 70;
    const highlightWords = s.highlightWords || [];
    const tokenizedHeadline = tokenizeHeadline(s.headline, highlightWords);

    const mediaId = (s.mediaAssetIds && s.mediaAssetIds[0]) ? s.mediaAssetIds[0] : null;
    const mediaUrl = mediaId ? assetMap[mediaId] : null;

    // Chapter badge / header
    let chapterBlock = '';
    if (s.chapterNumber || s.chapterTitle) {
      chapterBlock = `
        <div class="chapter-indicator">
          <span class="chapter-badge">CH.${s.chapterNumber || idx + 1}</span>
          ${s.chapterTitle ? `<span class="chapter-title">${escapeHtml(s.chapterTitle)}</span>` : ''}
        </div>
      `;
    }

    // Callout tags
    let calloutsBlock = '';
    if (Array.isArray(s.callouts) && s.callouts.length > 0) {
      calloutsBlock = `
        <div class="scene-callouts-layer">
          ${s.callouts.map((c, cIdx) => `
            <div class="ui-callout-tag placement-${c.placement || 'left'}" style="left: ${(c.x ?? 0.6) * 100}%; top: ${(c.y ?? 0.4) * 100}%; animation-delay: ${c.delaySeconds || 0.4}s;" data-callout-index="${cIdx}">
              <span class="callout-radar"></span>
              <span class="callout-pill">${escapeHtml(c.label)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Stat metric block
    let statBlock = '';
    if (s.kind === 'stat' || s.statValue) {
      statBlock = `
        <div class="stat-highlight-card">
          <div class="stat-huge-number">${escapeHtml(s.statValue || '10x')}</div>
          ${s.statLabel ? `<div class="stat-explanatory-label">${escapeHtml(s.statLabel)}</div>` : ''}
        </div>
      `;
    }

    // Media / Device frame block
    let mediaBlock = '';
    const rawDevice = (s.deviceFrame || s.deviceType || '').toLowerCase();
    const rawKind = (s.kind || '').toLowerCase();
    const rawLayout = (s.layout || '').toLowerCase();
    const isMockupKind = rawKind === 'device_mockup' || rawKind === 'ui_demo' || rawKind === 'device_demo' || rawLayout === 'device_mockup';

    let isMobile = false;
    let isBrowser = false;

    if (rawDevice === 'mobile' || rawDevice === 'phone' || rawDevice === 'smartphone') {
      isMobile = true;
    } else if (rawDevice === 'browser_window' || rawDevice === 'desktop' || rawDevice === 'browser' || rawDevice === 'window') {
      isBrowser = true;
    } else if (isMockupKind) {
      if (isAppShowcase) isMobile = true;
      else isBrowser = true;
    }

    const hasDevice = isMobile || isBrowser;

    if (isMobile) {
      mediaBlock = `
        <div class="phone-frame-container">
          <div class="phone-speaker-notch">
            <span class="phone-camera-dot"></span>
          </div>
          <div class="phone-screen-viewport">
            ${mediaUrl ? `<img src="${mediaUrl}" class="device-screen-img" alt="Mobile App Screen" />` : `
              <div class="generic-mobile-ui">
                <div class="mobile-app-header">
                  <span class="mobile-logo-text">${escapeHtml(brand.name || 'App')}</span>
                  <span class="mobile-live-badge">LIVE</span>
                </div>
                <div class="mobile-chat-bubble customer">
                  <span>${project.language === 'bn' ? 'দাম কত পড়বে?' : 'Is this currently available?'}</span>
                </div>
                <div class="mobile-chat-bubble bot">
                  <span>${project.language === 'bn' ? 'ধন্যবাদ! আপনার অর্ডারটি নিশ্চিত করা হয়েছে।' : 'Order confirmed! Instant delivery is active.'}</span>
                </div>
                <div class="mobile-card-demo">
                  <div class="card-icon">⚡</div>
                  <div class="card-body">
                    <strong>${escapeHtml(project.creative?.keyMessage?.slice(0, 36) || 'Instant Automation')}</strong>
                    <small>Verified Offline</small>
                  </div>
                </div>
              </div>
            `}
          </div>
          ${calloutsBlock}
        </div>
      `;
    } else if (isBrowser) {
      const urlBarText = project.creative?.cta?.destination ?
        project.creative.cta.destination.replace(/^https?:\/\//, '') :
        `${(brand.name || 'app').toLowerCase().replace(/[^a-z0-9]/g, '')}.workspace.local`;

      mediaBlock = `
        <div class="device-mockup-container browser_window">
          <div class="mockup-header">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
            <span class="mockup-url-bar">${escapeHtml(urlBarText)}</span>
          </div>
          <div class="mockup-viewport">
            ${mediaUrl ? `<img src="${mediaUrl}" class="device-screen-img" alt="Web UI Screenshot" />` : `
              <div class="mockup-placeholder generic-dashboard">
                <div class="ph-header">
                  <span>${escapeHtml(brand.name || 'Growth Studio')} Control Hub</span>
                  <span class="ph-badge">Active</span>
                </div>
                <div class="ph-metrics-row">
                  <div class="ph-metric-box"><small>Total Volume</small><strong>$42,850</strong></div>
                  <div class="ph-metric-box"><small>Conversion</small><strong>+38.4%</strong></div>
                  <div class="ph-metric-box"><small>Response</small><strong>0.8s</strong></div>
                </div>
                <div class="ph-row active"><div class="ph-avatar"></div><div class="ph-lines"><span></span><span></span></div></div>
                <div class="ph-row"><div class="ph-avatar"></div><div class="ph-lines"><span></span><span></span></div></div>
              </div>
            `}
          </div>
          ${calloutsBlock}
        </div>
      `;
    } else if (mediaUrl) {
      mediaBlock = `
        <div class="scene-media-wrapper">
          <img src="${mediaUrl}" class="scene-inline-media" alt="Media Asset" />
          ${calloutsBlock}
        </div>
      `;
    } else if (calloutsBlock) {
      mediaBlock = calloutsBlock;
    }

    // Call to Action button block
    let ctaBlock = '';
    if (s.kind === 'cta' || s.kind === 'cta_outro' || s.ctaLabel) {
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
      <section class="scene-card ${hasDevice ? 'has-device' : ''} ${mediaBlock ? 'has-media' : ''}" id="scene-${idx}" data-scene-id="${s.id}" data-start-time="${s.startTime}" data-end-time="${s.endTime}" data-duration="${s.durationSeconds}" data-entrance="${entrance}" data-exit="${exit}" data-easing="${easing}" data-stagger="${staggerMs}">
        <div class="scene-content">
          <div class="scene-text-group">
            ${chapterBlock}
            ${s.eyebrow ? `<div class="scene-eyebrow">${escapeHtml(s.eyebrow)}</div>` : ''}
            ${s.headline ? `<h1 class="scene-headline">${tokenizedHeadline}</h1>` : ''}
            ${s.subheadline ? `<div class="scene-subheadline">${escapeHtml(s.subheadline)}</div>` : ''}
            ${statBlock}
            ${s.body ? `<div class="scene-body">${escapeHtml(s.body)}</div>` : ''}
            ${ctaBlock}
          </div>
          ${mediaBlock ? `<div class="scene-media-group">${mediaBlock}</div>` : ''}
        </div>
      </section>
    `;
  }).join('\n');

  // Build the complete, deterministic HTML page
  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(project.project?.language || 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width}, height=${height}, initial-scale=1.0">
  <title>${escapeHtml(project.project?.name || 'Growth Studio Video')}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --target-w: ${width}px;
      --target-h: ${height}px;
      --safe-margin: ${target.safeMarginPercent || (is4x5 ? 8 : (isPortrait ? 9 : 7))}%;
      --primary: ${primaryColor};
      --bg: ${backgroundColor};
      --text: ${textColor};
      --accent: ${accentColor};
      --font-family: ${combinedFontStack};
      --radius: ${cornerRadius}px;
      --scale-factor: ${is4x5 ? (width / 1080) : (isPortrait ? (width / 1080) : (height / 1080))};
    }

    html, body {
      width: ${width}px;
      height: ${height}px;
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
      background: ${isGuidedStory ?
        `radial-gradient(circle at 50% 25%, rgba(204, 255, 0, 0.12) 0%, rgba(249, 249, 246, 0) 65%), var(--bg)` :
        `radial-gradient(circle at 50% 30%, rgba(116, 96, 217, 0.28) 0%, rgba(23, 34, 59, 0) 70%), var(--bg)`
      };
    }

    /* Ambient background glow or rules */
    ${isGuidedStory ? `
      .editorial-grid {
        position: absolute;
        inset: 0;
        background-size: 60px 60px;
        background-image: 
          linear-gradient(to right, rgba(24, 24, 27, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(24, 24, 27, 0.03) 1px, transparent 1px);
        pointer-events: none;
        z-index: 1;
      }
    ` : `
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
    `}

    /* Safe Area Overlay */
    #safe-area-overlay {
      position: absolute;
      top: var(--safe-margin);
      bottom: var(--safe-margin);
      left: var(--safe-margin);
      right: var(--safe-margin);
      border: 2px dashed rgba(204, 255, 0, 0.6);
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
      top: calc(var(--safe-margin) + 8px);
      left: calc(var(--safe-margin) + 8px);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 18px;
      background: ${isGuidedStory ? 'rgba(24, 24, 27, 0.06)' : 'rgba(255, 255, 255, 0.08)'};
      backdrop-filter: blur(12px);
      border: 1px solid ${isGuidedStory ? 'rgba(24, 24, 27, 0.12)' : 'rgba(255, 255, 255, 0.14)'};
      border-radius: 100px;
      font-size: calc(18px * var(--scale-factor));
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text);
      z-index: 20;
    }
    .brand-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px var(--accent);
    }

    /* Chapter Indicator */
    .chapter-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: calc(4px * var(--scale-factor));
      padding: 6px 16px;
      background: ${isGuidedStory ? 'rgba(24, 24, 27, 0.06)' : 'rgba(255, 255, 255, 0.08)'};
      border: 1px solid ${isGuidedStory ? 'rgba(24, 24, 27, 0.1)' : 'rgba(255, 255, 255, 0.12)'};
      border-radius: 100px;
      font-size: calc(16px * var(--scale-factor));
      font-weight: 700;
      color: var(--text);
    }
    .chapter-badge {
      color: ${isGuidedStory ? '#18181B' : 'var(--accent)'};
      font-weight: 900;
      letter-spacing: 0.1em;
    }
    .chapter-title {
      opacity: 0.85;
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
      max-width: ${is4x5 ? '92%' : (isPortrait ? '94%' : '86%')};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: calc(${is4x5 ? '18px' : '22px'} * var(--scale-factor));
    }

    .scene-text-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: calc(${is4x5 ? '14px' : '18px'} * var(--scale-factor));
      width: 100%;
    }

    .scene-media-group {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    ${(!isPortrait && !is4x5) ? `
      .scene-card.has-device .scene-content,
      .scene-card.has-media .scene-content {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        text-align: left;
        max-width: 90%;
        gap: calc(40px * var(--scale-factor));
      }
      .scene-card.has-device .scene-text-group,
      .scene-card.has-media .scene-text-group {
        flex: 1;
        max-width: 48%;
        align-items: flex-start;
        text-align: left;
      }
      .scene-card.has-device .scene-headline,
      .scene-card.has-media .scene-headline {
        text-align: left;
        font-size: calc(60px * var(--scale-factor));
      }
      .scene-card.has-device .scene-subheadline,
      .scene-card.has-media .scene-subheadline {
        text-align: left;
        max-width: 100%;
      }
      .scene-card.has-device .scene-media-group,
      .scene-card.has-media .scene-media-group {
        flex: 1;
        max-width: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .scene-card.has-device .phone-frame-container {
        width: calc(340px * var(--scale-factor));
        height: calc(520px * var(--scale-factor));
      }
      .scene-card.has-device .device-mockup-container {
        width: 100%;
        max-width: 100%;
      }
    ` : ''}

    /* Eyebrow kicker */
    .scene-eyebrow {
      font-size: calc(${is4x5 ? '20px' : '22px'} * var(--scale-factor));
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${isGuidedStory ? '#18181B' : 'var(--accent)'};
      background: ${isGuidedStory ? 'var(--accent)' : 'rgba(244, 195, 94, 0.12)'};
      border: 1px solid ${isGuidedStory ? 'transparent' : 'rgba(244, 195, 94, 0.3)'};
      padding: 6px 18px;
      border-radius: 100px;
      box-shadow: ${isGuidedStory ? '0 4px 12px rgba(204, 255, 0, 0.35)' : 'none'};
    }

    /* Headline with Kinetic Words */
    .scene-headline {
      font-size: calc(${is4x5 ? '64px' : (isPortrait ? '68px' : '76px')} * var(--scale-factor));
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: var(--text);
      display: inline-block;
      word-break: break-word;
    }

    .kinetic-word {
      display: inline-block;
      will-change: transform, opacity;
      margin: 0 calc(4px * var(--scale-factor));
    }

    /* Reference-Inspired Highlight Bar */
    .kinetic-word.highlighted {
      color: #18181B;
      background: var(--accent);
      padding: 2px 14px;
      border-radius: calc(var(--radius) * 0.5);
      box-shadow: 0 calc(6px * var(--scale-factor)) calc(18px * var(--scale-factor)) rgba(204, 255, 0, 0.45);
      transform-origin: center;
      position: relative;
    }

    /* Subheadline */
    .scene-subheadline {
      font-size: calc(${is4x5 ? '28px' : (isPortrait ? '32px' : '36px')} * var(--scale-factor));
      font-weight: 600;
      line-height: 1.38;
      color: ${isGuidedStory ? 'rgba(24, 24, 27, 0.82)' : 'rgba(255, 255, 255, 0.82)'};
      max-width: ${is4x5 ? '92%' : (isPortrait ? '90%' : '75%')};
    }

    /* Body Text */
    .scene-body {
      font-size: calc(${is4x5 ? '22px' : '24px'} * var(--scale-factor));
      line-height: 1.48;
      color: ${isGuidedStory ? 'rgba(24, 24, 27, 0.72)' : 'rgba(255, 255, 255, 0.68)'};
      max-width: 85%;
    }

    /* Stat Highlight Card */
    .stat-highlight-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: calc(8px * var(--scale-factor));
      margin: calc(12px * var(--scale-factor)) 0;
    }
    .stat-huge-number {
      font-size: calc(${is4x5 ? '110px' : '130px'} * var(--scale-factor));
      font-weight: 900;
      line-height: 1;
      letter-spacing: -0.04em;
      color: ${isGuidedStory ? 'var(--primary)' : 'var(--accent)'};
      text-shadow: ${isGuidedStory ? '0 10px 30px rgba(0,0,0,0.06)' : '0 10px 40px rgba(244, 195, 94, 0.35)'};
    }
    .stat-explanatory-label {
      font-size: calc(${is4x5 ? '24px' : '28px'} * var(--scale-factor));
      font-weight: 700;
      color: var(--text);
      opacity: 0.9;
    }

    /* Mobile Phone Frame */
    .phone-frame-container {
      position: relative;
      width: calc(${is4x5 ? '380px' : (isPortrait ? '410px' : '340px')} * var(--scale-factor));
      height: calc(${is4x5 ? '560px' : (isPortrait ? '620px' : '520px')} * var(--scale-factor));
      background: #111827;
      border: calc(10px * var(--scale-factor)) solid #1f2937;
      border-radius: calc(44px * var(--scale-factor));
      box-shadow: 0 calc(24px * var(--scale-factor)) calc(60px * var(--scale-factor)) rgba(0, 0, 0, 0.45);
      margin: calc(10px * var(--scale-factor)) auto;
    }
    .phone-speaker-notch {
      position: absolute;
      top: calc(8px * var(--scale-factor));
      left: 50%;
      transform: translateX(-50%);
      width: calc(100px * var(--scale-factor));
      height: calc(20px * var(--scale-factor));
      background: #030712;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    .phone-camera-dot {
      width: calc(8px * var(--scale-factor));
      height: calc(8px * var(--scale-factor));
      border-radius: 50%;
      background: #1f2937;
    }
    .phone-screen-viewport {
      width: 100%;
      height: 100%;
      background: #ffffff;
      color: #111827;
      overflow: hidden;
      border-radius: calc(34px * var(--scale-factor));
      display: flex;
      flex-direction: column;
    }
    .device-screen-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .generic-mobile-ui {
      padding: calc(40px * var(--scale-factor)) calc(16px * var(--scale-factor)) calc(16px * var(--scale-factor));
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
      background: #f8fafc;
    }
    .mobile-app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 800;
      font-size: calc(16px * var(--scale-factor));
    }
    .mobile-live-badge {
      background: #22c55e;
      color: white;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
    }
    .mobile-chat-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: calc(15px * var(--scale-factor));
      line-height: 1.35;
      text-align: left;
    }
    .mobile-chat-bubble.customer {
      align-self: flex-start;
      background: #e2e8f0;
      color: #0f172a;
      border-bottom-left-radius: 4px;
    }
    .mobile-chat-bubble.bot {
      align-self: flex-end;
      background: var(--primary);
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .mobile-card-demo {
      margin-top: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      text-align: left;
    }
    .mobile-card-demo .card-icon {
      font-size: 24px;
    }
    .mobile-card-demo small {
      display: block;
      color: #64748b;
    }

    /* Browser Desktop Mockup */
    .device-mockup-container {
      position: relative;
      width: 100%;
      max-width: ${is4x5 ? '92%' : (isPortrait ? '94%' : '75%')};
      background: ${isGuidedStory ? '#ffffff' : '#1e293b'};
      border: 1px solid ${isGuidedStory ? 'rgba(24, 24, 27, 0.12)' : 'rgba(255, 255, 255, 0.15)'};
      border-radius: calc(var(--radius) * 1.1);
      overflow: hidden;
      box-shadow: 0 calc(20px * var(--scale-factor)) calc(50px * var(--scale-factor)) rgba(0, 0, 0, ${isGuidedStory ? '0.12' : '0.55'});
      margin-top: calc(10px * var(--scale-factor));
    }
    .mockup-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: ${isGuidedStory ? '#f1f5f9' : '#0f172a'};
      border-bottom: 1px solid ${isGuidedStory ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'};
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
      color: ${isGuidedStory ? '#64748b' : 'rgba(255, 255, 255, 0.45)'};
      font-family: monospace;
    }
    .mockup-viewport {
      width: 100%;
      height: calc(${is4x5 ? '380px' : (isPortrait ? '440px' : '400px')} * var(--scale-factor));
      background: ${isGuidedStory ? '#ffffff' : '#090d16'};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .generic-dashboard {
      width: 92%;
      height: 88%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      color: ${isGuidedStory ? '#18181B' : '#ffffff'};
    }
    .ph-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: calc(17px * var(--scale-factor));
      font-weight: 800;
      border-bottom: 1px solid ${isGuidedStory ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'};
      padding-bottom: 8px;
      text-align: left;
    }
    .ph-badge {
      background: #22c55e;
      color: white;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 100px;
    }
    .ph-metrics-row {
      display: flex;
      gap: 12px;
    }
    .ph-metric-box {
      flex: 1;
      padding: 8px 12px;
      background: ${isGuidedStory ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)'};
      border: 1px solid ${isGuidedStory ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'};
      border-radius: 8px;
      text-align: left;
    }
    .ph-metric-box small {
      display: block;
      opacity: 0.6;
      font-size: 11px;
    }
    .ph-metric-box strong {
      font-size: calc(18px * var(--scale-factor));
      color: ${isGuidedStory ? 'var(--primary)' : 'var(--accent)'};
    }
    .ph-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: ${isGuidedStory ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'};
      border-radius: 6px;
    }
    .ph-row.active {
      background: ${isGuidedStory ? 'rgba(204, 255, 0, 0.18)' : 'rgba(116, 96, 217, 0.15)'};
      border-left: 3px solid ${isGuidedStory ? '#18181B' : 'var(--primary)'};
    }
    .ph-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: ${isGuidedStory ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'};
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
      background: ${isGuidedStory ? '#94a3b8' : 'rgba(255, 255, 255, 0.3)'};
      border-radius: 4px;
    }
    .ph-lines span:last-child {
      height: 6px;
      width: 40%;
      background: ${isGuidedStory ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'};
      border-radius: 4px;
    }

    /* UI Callout Badges */
    .scene-callouts-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 30;
    }
    .ui-callout-tag {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 8px;
      transform: translate(-50%, -50%);
      will-change: transform, opacity;
    }
    .callout-radar {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 14px var(--accent);
    }
    .callout-pill {
      background: #18181B;
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 100px;
      font-size: calc(14px * var(--scale-factor));
      font-weight: 800;
      box-shadow: 0 8px 20px rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.2);
      white-space: nowrap;
    }

    /* Call To Action Container */
    .scene-cta-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: calc(14px * var(--scale-factor));
      margin-top: calc(16px * var(--scale-factor));
    }
    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      padding: calc(16px * var(--scale-factor)) calc(40px * var(--scale-factor));
      background: ${isGuidedStory ? 'var(--accent)' : 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)'};
      color: ${isGuidedStory ? '#18181B' : '#ffffff'};
      font-size: calc(${is4x5 ? '28px' : '30px'} * var(--scale-factor));
      font-weight: 900;
      border-radius: 100px;
      box-shadow: ${isGuidedStory ? '0 calc(8px * var(--scale-factor)) calc(24px * var(--scale-factor)) rgba(204, 255, 0, 0.5)' : '0 calc(10px * var(--scale-factor)) calc(30px * var(--scale-factor)) rgba(116, 96, 217, 0.5)'};
      border: ${isGuidedStory ? '2px solid #18181B' : 'none'};
    }
    .cta-arrow {
      width: calc(26px * var(--scale-factor));
      height: calc(26px * var(--scale-factor));
    }
    .cta-destination {
      font-size: calc(20px * var(--scale-factor));
      font-weight: 600;
      letter-spacing: 0.05em;
      color: ${isGuidedStory ? '#18181B' : 'var(--accent)'};
      background: ${isGuidedStory ? 'rgba(24, 24, 27, 0.06)' : 'rgba(244, 195, 94, 0.1)'};
      padding: 6px 18px;
      border-radius: 100px;
      border: 1px solid ${isGuidedStory ? 'rgba(24, 24, 27, 0.12)' : 'rgba(244, 195, 94, 0.25)'};
    }
  </style>
</head>
<body>
  <div id="stage">
    ${isGuidedStory ? '<div class="editorial-grid"></div>' : '<div class="ambient-glow glow-1"></div><div class="ambient-glow glow-2"></div>'}
    <div id="safe-area-overlay"></div>

    <div class="brand-pill">
      <span class="brand-dot"></span>
      <span>${escapeHtml(brand.name || project.project?.name || 'Growth Studio')}</span>
    </div>

    ${sceneElementsHtml}
  </div>

  <script>
    // Embedded Deterministic Animation Engine (Preview & MP4 Parity)
    (function() {
      const fps = ${fps};
      const totalFrames = ${totalFrames};
      const totalDuration = ${totalDuration};

      const sceneData = ${JSON.stringify(timedScenes)};
      const scenes = Array.from(document.querySelectorAll('.scene-card'));

      // Smooth Easing functions
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

        for (let i = 0; i < sceneData.length; i++) {
          const s = sceneData[i];
          const el = scenes[i];
          if (!el) continue;

          const startTime = s.startTime;
          const endTime = s.endTime;
          const duration = s.durationSeconds;
          const isCurrent = time >= startTime && time <= endTime;

          if (!isCurrent) {
            el.classList.remove('active');
            el.style.opacity = '0';
            el.style.transform = 'translateY(40px)';
            continue;
          }

          el.classList.add('active');

          const localTime = time - startTime;
          const entranceDuration = Math.min(1.2, duration * 0.32);
          const exitDuration = Math.min(0.6, duration * 0.22);
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
              el.style.transform = 'translateX(' + ((1 - easedProgress) * 120) + 'px)';
            } else if (s.motion?.entrance === 'slide_right') {
              el.style.transform = 'translateX(' + ((easedProgress - 1) * 120) + 'px)';
            } else if (s.motion?.entrance === 'scale_pop') {
              scale = 0.72 + (0.28 * easedProgress);
              el.style.transform = 'scale(' + scale + ')';
            } else {
              translateY = (1 - easedProgress) * 45;
              el.style.transform = 'translateY(' + translateY + 'px)';
            }
            opacity = easedProgress;

            // Stagger words
            const wordSpans = el.querySelectorAll('.kinetic-word');
            const staggerStep = (s.motion?.staggerMilliseconds || 70) / 1000;
            wordSpans.forEach((wSpan, wIdx) => {
              const wordStart = wIdx * staggerStep;
              const wordProgress = clamp((localTime - wordStart) / (entranceDuration * 0.55), 0, 1);
              const wordEased = easeSpring(wordProgress);
              wSpan.style.opacity = String(wordProgress);
              wSpan.style.transform = 'translateY(' + ((1 - wordEased) * 35) + 'px)';
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
              el.style.transform = 'scale(' + (1 + exitEased * 0.18) + ')';
            } else {
              el.style.transform = 'translateY(' + (-exitEased * 25) + 'px)';
            }
          }
          // Hold phase with gentle subtle motion
          else {
            opacity = 1;
            const holdProgress = (localTime - holdStart) / Math.max(0.01, holdEnd - holdStart);
            scale = 1 + (Math.sin(holdProgress * Math.PI) * 0.015);
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

      // Playback loop for interactive preview
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
          currentTime = 0; // seamless loop
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

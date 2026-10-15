import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';

import {
  validateProjectSchema,
  createBlankProject,
  createSaasStarterProject,
  createMobileAppStarterProject,
  createGuidedStoryBanglaProject,
  createEasyModeratorProject,
  resolveStoragePaths,
  ensureStorageDirectories,
  preflightStorage,
  estimateRenderSpaceBytes,
  cleanupRenderTemp
} from '@kinetic-studio/contracts';

import {
  listTemplates,
  getTemplate,
  runPreflight,
  compileComposition
} from '@kinetic-studio/template-engine';

import {
  getChromePath,
  renderVideo,
  probeMedia,
  killProcessTree,
  pcmToWav,
  GEMINI_TTS_MODEL,
  GEMINI_TTS_VOICES,
  isGeminiTtsAvailable,
  synthesizeSpeechGemini
} from '@kinetic-studio/render-adapter';

import { CreativeOrchestrator } from './creative/creative-orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '4317', 10);
const HOST = '127.0.0.1';

const ROOT_DIR = path.resolve(__dirname, '../../../');
const storagePaths = resolveStoragePaths();
ensureStorageDirectories(storagePaths);

const PROJECTS_DIR = storagePaths.projects;
const EXPORTS_DIR = storagePaths.exports;
const RENDERS_DIR = storagePaths.renders;
const LOGS_DIR = storagePaths.logs;
const WEB_DIST_DIR = path.join(ROOT_DIR, 'apps/web/dist');

// In-memory render job store, abort controllers & event emitter
const renderJobs = new Map();
const abortControllers = new Map();
const jobEmitter = new EventEmitter();
const creativeOrchestrator = new CreativeOrchestrator({ storagePaths });
const creativeRequestTimes = new Map();
const creativeRequestsInFlight = new Set();

function reserveCreativeRequest(projectId) {
  const now = Date.now();
  const recent = (creativeRequestTimes.get(projectId) || []).filter(timestamp => now - timestamp < 10 * 60 * 1000);
  if (creativeRequestsInFlight.has(projectId)) return { ok: false, status: 409, error: 'A creative request for this project is already running.' };
  if (recent.length >= 20) return { ok: false, status: 429, error: 'Local creative request limit reached. Wait before requesting more generations.' };
  recent.push(now);
  creativeRequestTimes.set(projectId, recent);
  creativeRequestsInFlight.add(projectId);
  return { ok: true };
}

function releaseCreativeRequest(projectId) {
  creativeRequestsInFlight.delete(projectId);
}

function validLocalProjectId(id) {
  return typeof id === 'string' && path.basename(id) === id && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id);
}

function creativeFailure(err, reply) {
  const message = String(err?.message || 'Creative request failed.');
  const status = err?.code === 'consent_required' || err?.code === 'invalid_model' ? 400 :
    err?.code === 'configuration_missing' ? 503 :
      err?.code === 'provider_timeout' ? 504 :
        err?.code === 'provider_unavailable' || err?.code === 'provider_auth' ? 502 :
          err?.code === 'provider_rate_limited' || err?.code === 'request_cap_exceeded' || message.includes('AI spend limit reached') ? 429 :
            message.includes('not found') ? 404 :
              message.includes('approved or locked') || message.includes('Confirm replacing') ? 409 : 500;
  return reply.code(status).send({ error: message, code: err?.code || 'creative_request_failed', isBudgetError: status === 429 });
}

export async function buildServer() {
  const fastify = Fastify({
    logger: false,
    bodyLimit: 2 * 1024 * 1024 // Media uploads use streaming multipart limits below.
  });

  await fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      const allowedOrigins = new Set([
        `http://127.0.0.1:${PORT}`,
        `http://localhost:${PORT}`,
        'http://127.0.0.1:5173',
        'http://localhost:5173'
      ]);
      if (!origin || allowedOrigins.has(origin)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  const allowedBrowserOrigins = new Set([
    `http://127.0.0.1:${PORT}`,
    `http://localhost:${PORT}`,
    'http://127.0.0.1:5173',
    'http://localhost:5173'
  ]);
  fastify.addHook('onRequest', async (request, reply) => {
    const hostHeader = String(request.headers.host || '');
    let hostname = '';
    try { hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase(); } catch {}
    if (hostHeader && !['127.0.0.1', 'localhost'].includes(hostname)) {
      return reply.code(403).send({ error: 'Growth Studio accepts requests only through its loopback address.' });
    }
    const origin = request.headers.origin;
    if (origin && !allowedBrowserOrigins.has(origin)) {
      return reply.code(403).send({ error: 'This browser origin is not allowed to access local project data.' });
    }
  });

  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB
    }
  });

  // Serve exported videos
  await fastify.register(fastifyStatic, {
    root: EXPORTS_DIR,
    prefix: '/api/exports/',
    decorateReply: false
  });

  // Health check
  fastify.get('/api/health', async () => {
    let chromeOk = false;
    let chromePath = null;
    try {
      chromePath = getChromePath();
      chromeOk = true;
    } catch (_) {}

    const diskInfo = storagePaths.getDiskSpace();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      node: process.version,
      chrome: {
        available: chromeOk,
        path: chromePath
      },
      ffmpeg: true,
      ffprobe: true,
      storage: {
        root: storagePaths.root,
        isEDrive: storagePaths.isEDrive,
        freeGB: diskInfo.freeGB,
        totalGB: diskInfo.totalGB
      },
      port: PORT
    };
  });

  // List templates
  fastify.get('/api/templates', async () => {
    return listTemplates();
  });

  // Get template details
  fastify.get('/api/templates/:id', async (request, reply) => {
    const { id } = request.params;
    const t = getTemplate(id);
    if (!t) return reply.code(404).send({ error: 'Template not found' });
    return t;
  });

  // List starter templates
  fastify.get('/api/starters', async () => {
    return [
      {
        id: 'blank',
        name: 'New Blank Video',
        description: 'Clean canvas with minimal structure for any brand or product.',
        templateId: 'bold_kinetic',
        language: 'en'
      },
      {
        id: 'guided_bangla',
        name: 'বাংলা পণ্যের গল্প',
        description: 'A Bengali-first editable story starter with space for your own evidence and brand.',
        templateId: 'guided_product_story',
        language: 'bn'
      },
      {
        id: 'saas',
        name: 'SaaS Product Story',
        description: 'A neutral software promo outline; add your own verified product details.',
        templateId: 'bold_kinetic',
        language: 'en'
      },
      {
        id: 'mobile',
        name: 'Mobile App Showcase',
        description: 'A mobile app outline with a screen placeholder for your own product assets.',
        templateId: 'app_showcase',
        language: 'en'
      },
      {
        id: 'easymoderator',
        name: 'EasyModerator — Bold & Future-Facing',
        description: 'Use the EasyModerator brand colors and supplied visual assets as a starting point.',
        templateId: 'guided_product_story',
        language: 'mixed'
      }
    ];
  });

  // List projects
  fastify.get('/api/projects', async () => {
    const list = [];
    if (!fs.existsSync(PROJECTS_DIR)) return list;

    const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const projFile = path.join(PROJECTS_DIR, ent.name, 'project.json');
        if (fs.existsSync(projFile)) {
          try {
            const data = JSON.parse(fs.readFileSync(projFile, 'utf8'));
            const stat = fs.statSync(projFile);
            const preflight = runPreflight(data);
            list.push({
              id: data.project?.id || ent.name,
              name: data.project?.name || ent.name,
              templateId: data.template?.id || 'bold_kinetic',
              sceneCount: (data.scenes || []).length,
              duration: preflight.totalDuration,
              updatedAt: stat.mtime.toISOString(),
              valid: preflight.passed
            });
          } catch (e) {
            console.error(`Error reading project ${ent.name}:`, e);
          }
        }
      }
    }
    // Sort recently updated first
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  });

  // Create project
  fastify.post('/api/projects', async (request, reply) => {
    const body = request.body || {};
    let project;

    const starterChoice = body.starter || body.preset;
    if (starterChoice === 'guided_bangla' || starterChoice === 'bangla') {
      project = createGuidedStoryBanglaProject();
    } else if (starterChoice === 'saas') {
      project = createSaasStarterProject();
    } else if (starterChoice === 'mobile') {
      project = createMobileAppStarterProject();
    } else if (starterChoice === 'easymoderator') {
      project = createEasyModeratorProject();
    } else {
      // Generic blank starter
      project = createBlankProject(body.name || 'New Video Project', body.language || 'en');
      if (body.templateId) {
        project.template.id = body.templateId;
      }
    }

    if (body.name) {
      project.project.name = body.name;
    }

    // Assign unique sanitized project ID
    let baseSlug = (project.project.id || 'promo').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    let id = baseSlug;
    let targetDir = path.join(PROJECTS_DIR, id);
    let counter = 1;
    while (fs.existsSync(targetDir)) {
      id = `${baseSlug}-${counter++}`;
      targetDir = path.join(PROJECTS_DIR, id);
    }
    project.project.id = id;
    if (project.export) project.export.fileStem = id;

    fs.mkdirSync(targetDir, { recursive: true });
    const assetsDir = path.join(targetDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'snapshots'), { recursive: true });

    // Seed default assets from starter repo if referenced
    const seedAssetsDir = path.resolve('data/projects/easymoderator-launch/assets');
    if (fs.existsSync(seedAssetsDir) && Array.isArray(project.assets)) {
      for (const asset of project.assets) {
        if (asset.file) {
          const fileName = path.basename(asset.file);
          const seedFilePath = path.join(seedAssetsDir, fileName);
          const targetFilePath = path.join(assetsDir, fileName);
          if (fs.existsSync(seedFilePath) && !fs.existsSync(targetFilePath)) {
            try {
              fs.copyFileSync(seedFilePath, targetFilePath);
            } catch (_) {}
          }
        }
      }
    }

    const projFile = path.join(targetDir, 'project.json');
    fs.writeFileSync(projFile, JSON.stringify(project, null, 2), 'utf8');

    return reply.code(201).send(project);
  });

  // Get project JSON
  fastify.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const projFile = path.join(PROJECTS_DIR, safeId, 'project.json');
    if (!fs.existsSync(projFile)) {
      return reply.code(404).send({ error: `Project '${safeId}' not found` });
    }
    const data = JSON.parse(fs.readFileSync(projFile, 'utf8'));
    return data;
  });

  // Save / update project JSON
  fastify.put('/api/projects/:id', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const project = request.body;
    if (!project || typeof project !== 'object') {
      return reply.code(400).send({ error: 'Invalid JSON payload' });
    }

    const validation = validateProjectSchema(project);
    if (!validation.valid) {
      return reply.code(400).send({
        error: 'Project schema validation failed',
        details: validation.errors
      });
    }

    const targetDir = path.join(PROJECTS_DIR, safeId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      fs.mkdirSync(path.join(targetDir, 'assets'), { recursive: true });
      fs.mkdirSync(path.join(targetDir, 'snapshots'), { recursive: true });
    }

    const projFile = path.join(targetDir, 'project.json');
    fs.writeFileSync(projFile, JSON.stringify(project, null, 2), 'utf8');

    // Create timestamped snapshot
    try {
      const snapPath = path.join(targetDir, 'snapshots', `rev-${Date.now()}.json`);
      fs.writeFileSync(snapPath, JSON.stringify(project), 'utf8');
    } catch (_) {}

    return { success: true, project };
  });

  // Delete project
  fastify.delete('/api/projects/:id', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const targetDir = path.join(PROJECTS_DIR, safeId);
    if (!fs.existsSync(targetDir)) {
      return reply.code(404).send({ error: 'Project not found' });
    }
    fs.rmSync(targetDir, { recursive: true, force: true });
    return { success: true, message: `Project '${safeId}' deleted` };
  });

  // Upload asset
  fastify.post('/api/projects/:id/assets', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const targetDir = path.join(PROJECTS_DIR, safeId);
    const assetsDir = path.join(targetDir, 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const originalName = data.filename || 'asset.png';
    const ext = path.extname(originalName).toLowerCase();
    
    // Security check: restrict allowed file extensions
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp3', '.wav', '.aac', '.ogg', '.m4a'];
    if (!allowedExtensions.includes(ext)) {
      return reply.code(400).send({ error: `Unsupported file extension '${ext}'. Allowed: ${allowedExtensions.join(', ')}` });
    }

    const safeStem = path.basename(originalName, ext).replace(/[^a-z0-9_-]/gi, '-');
    const filename = `${safeStem}-${Date.now()}${ext}`;
    const filePath = path.join(assetsDir, filename);

    const buffer = await data.toBuffer();
    fs.writeFileSync(filePath, buffer);

    let kind = 'image';
    if (['.wav', '.mp3', '.aac', '.ogg', '.m4a'].includes(ext)) {
      kind = 'music';
    } else if (originalName.toLowerCase().includes('logo')) {
      kind = 'logo';
    }

    const assetId = `${safeStem}-${Date.now().toString(36)}`;
    const assetEntry = {
      id: assetId,
      kind,
      file: `assets/${filename}`,
      usageRights: 'owner'
    };

    // Update project.json
    const projFile = path.join(targetDir, 'project.json');
    if (fs.existsSync(projFile)) {
      try {
        const proj = JSON.parse(fs.readFileSync(projFile, 'utf8'));
        proj.assets = proj.assets || [];
        proj.assets.push(assetEntry);
        fs.writeFileSync(projFile, JSON.stringify(proj, null, 2), 'utf8');
      } catch (e) {
        console.error('Failed to update project.json with asset:', e);
      }
    }

    return reply.code(201).send({
      success: true,
      asset: assetEntry
    });
  });

  // Serve project asset
  fastify.get('/api/projects/:id/assets/:filename', async (request, reply) => {
    const { id, filename } = request.params;
    const safeId = path.basename(id);
    const safeFilename = path.basename(filename);
    const assetPath = path.join(PROJECTS_DIR, safeId, 'assets', safeFilename);
    if (!fs.existsSync(assetPath)) {
      return reply.code(404).send({ error: 'Asset file not found' });
    }
    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.aac': 'audio/aac',
      '.m4a': 'audio/mp4'
    };
    reply.type(mimeMap[ext] || 'application/octet-stream');
    return fs.createReadStream(assetPath);
  });

  // Check TTS provider status
  fastify.get('/api/narration/provider-status', async () => {
    return {
      available: isGeminiTtsAvailable(),
      provider: 'gemini',
      model: GEMINI_TTS_MODEL,
      voices: GEMINI_TTS_VOICES,
      supportedLanguages: [
        { code: 'bn', name: 'Bangla (বাংলা)' },
        { code: 'en', name: 'English' },
        { code: 'mixed', name: 'Mixed Bangla + English' }
      ]
    };
  });

  // Preview TTS audio (in-browser immediate playback)
  fastify.post('/api/narration/preview', { bodyLimit: 16 * 1024 }, async (request, reply) => {
    const { projectId, sceneId, voice = 'Puck', consentToSend } = request.body || {};
    if (!validLocalProjectId(projectId) || !sceneId || consentToSend !== true) {
      return reply.code(400).send({ error: 'Choose an approved scene and confirm sending its script to Gemini.' });
    }
    const projectFile = path.join(PROJECTS_DIR, projectId, 'project.json');
    if (!fs.existsSync(projectFile)) return reply.code(404).send({ error: 'Project not found.' });
    const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
    const scene = (project.scenes || []).find(item => item.id === sceneId);
    if (!scene) return reply.code(404).send({ error: 'Scene not found.' });
    if (!(scene.isApproved === true || ['approved', 'locked'].includes(scene.approvalStatus))) {
      return reply.code(409).send({ error: 'Approve this scene narration before sending it to Gemini.' });
    }
    const text = String(scene.narrationText || '').trim();
    if (!text) return reply.code(400).send({ error: 'The approved scene has no narration script.' });
    try {
      const cacheDir = path.join(storagePaths.renders, 'tts_cache');
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const result = await synthesizeSpeechGemini({ text, voice, model: GEMINI_TTS_MODEL, cacheDir });
      reply.type('audio/wav');
      return result.wavBuffer;
    } catch (err) {
      return reply.code(502).send({ error: err.message.includes('not set') ? err.message : 'Gemini TTS request failed. Check provider status, account access, quota, and network.' });
    }
  });

  // Generate per-scene or all-scenes narration
  fastify.post('/api/projects/:id/narration/generate', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const {
      sceneId,
      allScenes = false,
      voice = 'Puck',
      consentToSend,
      fitDuration = true
    } = request.body || {};

    if (!validLocalProjectId(id)) return reply.code(400).send({ error: 'Invalid project ID.' });
    if (consentToSend !== true) return reply.code(400).send({ error: 'Confirm sending the approved scene script(s) to Gemini.' });

    const projFile = path.join(PROJECTS_DIR, safeId, 'project.json');
    if (!fs.existsSync(projFile)) {
      return reply.code(404).send({ error: 'Project not found' });
    }
    const project = JSON.parse(fs.readFileSync(projFile, 'utf8'));
    project.assets = project.assets || [];

    const cacheDir = path.join(storagePaths.renders, 'tts_cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const scenesToProcess = allScenes
      ? (project.scenes || [])
      : (project.scenes || []).filter(s => s.id === sceneId);

    if (scenesToProcess.length === 0) {
      return reply.code(400).send({ error: 'No matching scenes found to generate narration for' });
    }
    const unapprovedScene = scenesToProcess.find(scene => !(scene.isApproved === true || ['approved', 'locked'].includes(scene.approvalStatus)));
    if (unapprovedScene) {
      return reply.code(409).send({ error: `Approve narration for scene '${unapprovedScene.id}' before sending it to Gemini.` });
    }
    if (scenesToProcess.some(scene => !String(scene.narrationText || '').trim())) {
      return reply.code(400).send({ error: 'Every selected scene needs an approved, non-empty narration script.' });
    }

    const generated = [];

    for (const scene of scenesToProcess) {
      const narrationText = scene.narrationText.trim();

      let ttsResult;
      try {
        ttsResult = await synthesizeSpeechGemini({
          text: narrationText,
          voice,
          model: GEMINI_TTS_MODEL,
          cacheDir
        });
      } catch (err) {
        const missingKey = String(err?.message || '').includes('CONTENT_STUDIO_GEMINI');
        return reply.code(missingKey ? 503 : 502).send({
          error: missingKey
            ? 'Gemini TTS is not configured. Import a narration WAV or continue offline.'
            : 'Gemini TTS request failed. Check provider status, account access, quota, and network.',
          code: missingKey ? 'configuration_missing' : 'tts_provider_failed'
        });
      }

      const filename = `narration-${randomUUID()}.wav`;
      const assetRelPath = `assets/${filename}`;
      const assetFullPath = path.join(PROJECTS_DIR, safeId, 'assets', filename);
      fs.writeFileSync(assetFullPath, ttsResult.wavBuffer);

      const assetId = `voice-${scene.id}`;
      // Remove previous asset entry if any
      project.assets = project.assets.filter(a => a.id !== assetId);
      project.assets.push({
        id: assetId,
        kind: 'voice',
        file: assetRelPath,
        durationSeconds: ttsResult.durationSeconds,
        sampleRate: ttsResult.sampleRate,
        channels: 1,
        source: 'gemini_tts',
        provenance: {
          model: GEMINI_TTS_MODEL,
          voice,
          textLength: narrationText.length,
          timestamp: new Date().toISOString()
        }
      });

      scene.narrationAssetId = assetId;
      scene.narrationDurationSeconds = ttsResult.durationSeconds;
      if (fitDuration && scene.durationSeconds < ttsResult.durationSeconds + 0.5) {
        scene.durationSeconds = Math.max(scene.durationSeconds, Math.ceil(ttsResult.durationSeconds + 0.5));
      }

      generated.push({
        sceneId: scene.id,
        assetId,
        file: assetRelPath,
        durationSeconds: ttsResult.durationSeconds,
        sceneDuration: scene.durationSeconds
      });
    }

    // Activate voice mode if previously silent or unset
    if (!project.audio) project.audio = {};
    if (project.audio.mode === 'silent' || !project.audio.mode) {
      project.audio.mode = project.audio.musicAssetId ? 'voice_and_music' : 'generated_voice';
    }
    project.audio.muteAll = false;
    project.audio.narration = {
      provider: 'gemini',
      voice,
      model: GEMINI_TTS_MODEL
    };

    fs.writeFileSync(projFile, JSON.stringify(project, null, 2), 'utf8');

    return {
      success: true,
      generated,
      project
    };
  });

  // Adjust scene durations to fit voiceover
  fastify.post('/api/projects/:id/audio/fit-scenes', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const { paddingSeconds = 0.5 } = request.body || {};

    const projFile = path.join(PROJECTS_DIR, safeId, 'project.json');
    if (!fs.existsSync(projFile)) {
      return reply.code(404).send({ error: 'Project not found' });
    }
    const project = JSON.parse(fs.readFileSync(projFile, 'utf8'));

    let changed = false;
    for (const scene of (project.scenes || [])) {
      if (scene.narrationDurationSeconds) {
        const needed = Math.max(scene.durationSeconds || 3, Math.ceil(scene.narrationDurationSeconds + paddingSeconds));
        if (scene.durationSeconds !== needed) {
          scene.durationSeconds = needed;
          changed = true;
        }
      }
    }

    if (changed) {
      fs.writeFileSync(projFile, JSON.stringify(project, null, 2), 'utf8');
    }

    return {
      success: true,
      scenes: project.scenes
    };
  });

  // Creative Director: Provider Status & Active Models
  fastify.get('/api/creative/provider-status', async () => {
    return creativeOrchestrator.getStatus();
  });

  // Creative Director: Develop 3 distinct advertising concepts
  fastify.post('/api/projects/:id/creative/concepts', { bodyLimit: 128 * 1024 }, async (request, reply) => {
    const { id } = request.params;
    if (!validLocalProjectId(id)) return reply.code(400).send({ error: 'Invalid project ID.' });
    const safeId = path.basename(id);
    const { brief = {}, model, consentToSend, forceRegenerate } = request.body || {};
    const reservation = reserveCreativeRequest(safeId);
    if (!reservation.ok) return reply.code(reservation.status).send({ error: reservation.error });

    try {
      const result = await creativeOrchestrator.developConcepts(safeId, brief, { model, consentToSend, forceRegenerate });
      const updatedProject = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, safeId, 'project.json'), 'utf8'));
      return {
        success: true,
        concepts: result.concepts,
        modelUsed: result.modelUsed,
        usage: result.usage,
        estimatedCostUsd: result.estimatedCostUsd,
        cacheHit: result.cacheHit,
        durationMs: result.durationMs,
        project: updatedProject
      };
    } catch (err) {
      return creativeFailure(err, reply);
    } finally {
      releaseCreativeRequest(safeId);
    }
  });

  // Creative Director: Compile storyboard from approved concept
  fastify.post('/api/projects/:id/creative/storyboard', { bodyLimit: 128 * 1024 }, async (request, reply) => {
    const { id } = request.params;
    if (!validLocalProjectId(id)) return reply.code(400).send({ error: 'Invalid project ID.' });
    const safeId = path.basename(id);
    const { conceptId, model, consentToSend, replaceScenesConfirmed, forceRegenerate } = request.body || {};
    const reservation = reserveCreativeRequest(safeId);
    if (!reservation.ok) return reply.code(reservation.status).send({ error: reservation.error });

    try {
      const result = await creativeOrchestrator.compileStoryboard(safeId, conceptId, { model, consentToSend, replaceScenesConfirmed, forceRegenerate });
      return {
        success: true,
        project: result.project,
        modelUsed: result.modelUsed,
        usage: result.usage,
        estimatedCostUsd: result.estimatedCostUsd,
        cacheHit: result.cacheHit
      };
    } catch (err) {
      return creativeFailure(err, reply);
    } finally {
      releaseCreativeRequest(safeId);
    }
  });

  // Creative Director: Selective single-scene rewrite
  fastify.post('/api/projects/:id/creative/scenes/:sceneId/rewrite', { bodyLimit: 64 * 1024 }, async (request, reply) => {
    const { id, sceneId } = request.params;
    if (!validLocalProjectId(id) || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$/.test(sceneId)) return reply.code(400).send({ error: 'Invalid project or scene ID.' });
    const safeId = path.basename(id);
    const { instruction, prompt, model, consentToSend, forceRegenerate } = request.body || {};
    const effectiveInstruction = instruction || prompt;

    if (!effectiveInstruction || !effectiveInstruction.trim()) {
      return reply.code(400).send({ error: 'Revision instruction is required' });
    }

    const reservation = reserveCreativeRequest(safeId);
    if (!reservation.ok) return reply.code(reservation.status).send({ error: reservation.error });

    try {
      const result = await creativeOrchestrator.rewriteScene(safeId, sceneId, effectiveInstruction, { model, consentToSend, forceRegenerate });
      return {
        success: true,
        scene: result.scene,
        project: result.project,
        modelUsed: result.modelUsed,
        usage: result.usage,
        estimatedCostUsd: result.estimatedCostUsd,
        cacheHit: result.cacheHit
      };
    } catch (err) {
      return creativeFailure(err, reply);
    } finally {
      releaseCreativeRequest(safeId);
    }
  });

  // Creative Director: Comprehensive project creative review
  fastify.post('/api/projects/:id/creative/review', { bodyLimit: 64 * 1024 }, async (request, reply) => {
    const { id } = request.params;
    if (!validLocalProjectId(id)) return reply.code(400).send({ error: 'Invalid project ID.' });
    const safeId = path.basename(id);
    const { model, consentToSend, forceRegenerate } = request.body || {};
    const reservation = reserveCreativeRequest(safeId);
    if (!reservation.ok) return reply.code(reservation.status).send({ error: reservation.error });

    try {
      const result = await creativeOrchestrator.reviewProject(safeId, { model, consentToSend, forceRegenerate });
      return {
        success: true,
        audit: result.audit,
        modelUsed: result.modelUsed,
        usage: result.usage,
        estimatedCostUsd: result.estimatedCostUsd,
        cacheHit: result.cacheHit
      };
    } catch (err) {
      return creativeFailure(err, reply);
    } finally {
      releaseCreativeRequest(safeId);
    }
  });

  // Creative Director: Revision history
  fastify.get('/api/projects/:id/creative/history', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    return creativeOrchestrator.getHistory(safeId);
  });

  // Creative Director: Token usage & spend receipts
  fastify.get('/api/projects/:id/creative/usage', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    return creativeOrchestrator.usageRecorder.getUsage(safeId);
  });

  // Creative Director: Update project budget cap
  fastify.post('/api/projects/:id/creative/budget', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const { budgetCapUsd } = request.body || {};
    try {
      const updated = creativeOrchestrator.usageRecorder.setBudget(safeId, budgetCapUsd);
      return { success: true, usage: updated };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Run Preflight validation & storage check
  fastify.post('/api/projects/:id/preflight', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const projFile = path.join(PROJECTS_DIR, safeId, 'project.json');
    if (!fs.existsSync(projFile)) {
      return reply.code(404).send({ error: 'Project not found' });
    }
    const project = JSON.parse(fs.readFileSync(projFile, 'utf8'));
    const preflight = runPreflight(project);

    // Dynamic storage preflight calculation
    const estimatedBytes = estimateRenderSpaceBytes(preflight.totalDuration, 1080, 1920, 30);
    const storageCheck = preflightStorage(storagePaths, estimatedBytes);

    if (!storageCheck.passed) {
      preflight.passed = false;
      preflight.errors.push(storageCheck.error);
    }

    return {
      ...preflight,
      storage: {
        root: storagePaths.root,
        isEDrive: storagePaths.isEDrive,
        freeGB: storageCheck.freeGB,
        estimatedNeededGB: storageCheck.estimatedNeededGB,
        hasHeadroom: storageCheck.passed
      }
    };
  });

  // Compile Preview JSON
  fastify.post('/api/projects/:id/preview', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const { targetId = 'portrait' } = request.body || {};
    const projFile = path.join(PROJECTS_DIR, safeId, 'project.json');
    if (!fs.existsSync(projFile)) {
      return reply.code(404).send({ error: 'Project not found' });
    }
    const project = JSON.parse(fs.readFileSync(projFile, 'utf8'));
    const assetBaseUrl = `/api/projects/${safeId}/`;
    const comp = compileComposition({ project, targetId, assetBaseUrl });
    return {
      target: comp.target,
      totalDuration: comp.totalDuration,
      totalFrames: comp.totalFrames,
      fps: comp.fps,
      timedScenes: comp.timedScenes
    };
  });

  // Direct HTML Preview (loaded in iframe for interactive playback)
  fastify.get('/api/projects/:id/preview-html', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const { target = 'portrait' } = request.query;
    const projFile = path.join(PROJECTS_DIR, safeId, 'project.json');
    if (!fs.existsSync(projFile)) {
      return reply.code(404).send({ error: 'Project not found' });
    }
    const project = JSON.parse(fs.readFileSync(projFile, 'utf8'));
    const assetBaseUrl = `/api/projects/${safeId}/`;
    const comp = compileComposition({ project, targetId: target, assetBaseUrl });
    reply.type('text/html');
    return comp.html;
  });

  // Queue a Render Job
  fastify.post('/api/projects/:id/renders', async (request, reply) => {
    const { id } = request.params;
    const safeId = path.basename(id);
    const { targetId = 'portrait' } = request.body || {};
    const projFile = path.join(PROJECTS_DIR, safeId, 'project.json');
    if (!fs.existsSync(projFile)) {
      return reply.code(404).send({ error: 'Project not found' });
    }
    const project = JSON.parse(fs.readFileSync(projFile, 'utf8'));

    const fileStem = project.export?.fileStem || safeId;
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const outputFileName = `${fileStem}-${targetId}.mp4`;
    const outputPath = path.join(EXPORTS_DIR, outputFileName);

    const controller = new AbortController();
    abortControllers.set(jobId, controller);

    const job = {
      id: jobId,
      projectId: safeId,
      targetId,
      status: 'queued',
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      percent: 0,
      outputPath,
      outputFileName,
      metadata: null,
      error: null,
      logs: [`Job ${jobId} queued for target ${targetId}`],
      startedAt: new Date().toISOString(),
      completedAt: null
    };

    renderJobs.set(jobId, job);

    // Run render asynchronously
    executeRenderJob(job, project, controller.signal).catch(err => {
      if (job.status === 'cancelled') return;
      console.error(`Render job ${jobId} failed:`, err);
      job.status = 'failed';
      job.error = err.message;
      job.logs.push(`FAILED: ${err.message}`);
      jobEmitter.emit(`job:${jobId}`, { ...job });
    }).finally(() => {
      abortControllers.delete(jobId);
    });

    return reply.code(202).send({
      jobId,
      status: 'queued',
      targetId,
      outputFileName,
      storageRoot: storagePaths.root
    });
  });

  // Get Render Job Status
  fastify.get('/api/renders/:jobId', async (request, reply) => {
    const { jobId } = request.params;
    const job = renderJobs.get(jobId);
    if (!job) return reply.code(404).send({ error: 'Render job not found' });
    return job;
  });

  // Server-Sent Events (SSE) for Render Progress
  fastify.get('/api/renders/:jobId/events', async (request, reply) => {
    const { jobId } = request.params;
    const job = renderJobs.get(jobId);
    if (!job) return reply.code(404).send({ error: 'Render job not found' });

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    const sendEvent = data => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent(job);

    const listener = updatedJob => {
      sendEvent(updatedJob);
      if (['done', 'failed', 'cancelled'].includes(updatedJob.status)) {
        jobEmitter.removeListener(`job:${jobId}`, listener);
        reply.raw.end();
      }
    };

    jobEmitter.on(`job:${jobId}`, listener);

    request.raw.on('close', () => {
      jobEmitter.removeListener(`job:${jobId}`, listener);
    });
  });

  // Download finished MP4
  fastify.get('/api/renders/:jobId/file', async (request, reply) => {
    const { jobId } = request.params;
    const job = renderJobs.get(jobId);
    if (!job || job.status !== 'done' || !fs.existsSync(job.outputPath)) {
      return reply.code(404).send({ error: 'Rendered file not ready or not found' });
    }
    reply.header('Content-Disposition', `attachment; filename="${job.outputFileName}"`);
    reply.type('video/mp4');
    return fs.createReadStream(job.outputPath);
  });

  // Cancel render job (terminates processes and scratch files)
  fastify.delete('/api/renders/:jobId', async (request, reply) => {
    const { jobId } = request.params;
    const job = renderJobs.get(jobId);
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    const controller = abortControllers.get(jobId);
    if (controller) {
      controller.abort();
      abortControllers.delete(jobId);
    }

    job.status = 'cancelled';
    job.logs.push('Render job cancelled by user.');
    jobEmitter.emit(`job:${jobId}`, { ...job });

    cleanupRenderTemp(jobId, storagePaths);

    return { success: true, message: `Job ${jobId} cancelled successfully` };
  });

  // Serve Web UI bundle if built
  if (fs.existsSync(WEB_DIST_DIR)) {
    await fastify.register(fastifyStatic, {
      root: WEB_DIST_DIR,
      prefix: '/',
      decorateReply: false
    });

    fastify.setNotFoundHandler((request, reply) => {
      if (request.raw.url && request.raw.url.startsWith('/api')) {
        return reply.code(404).send({ error: 'API route not found' });
      }
      const indexPath = path.join(WEB_DIST_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        reply.type('text/html');
        return fs.createReadStream(indexPath);
      }
      reply.code(404).send({ error: 'Not found' });
    });
  }

  return fastify;
}

async function executeRenderJob(job, project, signal = null) {
  job.status = 'validating';
  job.logs.push('Validating project preflight checks...');
  jobEmitter.emit(`job:${job.id}`, { ...job });

  const preflight = runPreflight(project);
  if (!preflight.passed) {
    throw new Error(`Preflight checks failed: ${preflight.errors.join('; ')}`);
  }

  // Preflight storage space
  const estimatedBytes = estimateRenderSpaceBytes(preflight.totalDuration, 1080, 1920, 30);
  const storageCheck = preflightStorage(storagePaths, estimatedBytes);
  if (!storageCheck.passed) {
    throw new Error(storageCheck.error);
  }

  // Resolve assets locally for offline Chrome rendering
  const projectAssetsDir = path.join(PROJECTS_DIR, job.projectId, 'assets');
  let assetBaseUrl = `file://${projectAssetsDir}/`;
  if (process.platform === 'win32') {
    assetBaseUrl = `file:///${projectAssetsDir.replace(/\\/g, '/')}/`;
  }

  job.status = 'rendering';
  job.logs.push(`Compiling composition for ${job.targetId}...`);
  jobEmitter.emit(`job:${job.id}`, { ...job });

  const comp = compileComposition({
    project,
    targetId: job.targetId,
    assetBaseUrl
  });

  job.totalFrames = comp.totalFrames;
  job.logs.push(`Starting offline render of ${comp.totalFrames} frames at ${comp.target.width}x${comp.target.height} (${comp.fps} FPS) on ${storagePaths.root}...`);
  jobEmitter.emit(`job:${job.id}`, { ...job });

  // Assemble audio tracks and music
  const audioTracks = [];
  let audioPath = null;
  const isMuteAll = project.audio?.muteAll === true || project.audio?.mode === 'silent';

  if (!isMuteAll) {
    // 1. Scene narration tracks
    let sceneStartTime = 0;
    for (const scene of (project.scenes || [])) {
      const sceneDur = Number(scene.durationSeconds || 3);
      if (scene.narrationAssetId) {
        const narrAsset = (project.assets || []).find(a => a.id === scene.narrationAssetId);
        if (narrAsset && narrAsset.file) {
          const narrPath = path.join(PROJECTS_DIR, job.projectId, narrAsset.file);
          if (fs.existsSync(narrPath)) {
            audioTracks.push({
              id: `narration-${scene.id}`,
              type: 'voice',
              path: narrPath,
              startTime: sceneStartTime,
              duration: scene.narrationDurationSeconds || narrAsset.durationSeconds,
              volume: project.audio?.voiceVolume ?? 1.0
            });
            job.logs.push(`Added scene narration (${scene.id}): ${narrAsset.file} at ${sceneStartTime.toFixed(2)}s`);
          }
        }
      }
      sceneStartTime += sceneDur;
    }

    // 2. Project-level clips (if any defined in project.audio.clips)
    for (const clip of (project.audio?.clips || [])) {
      const asset = (project.assets || []).find(a => a.id === clip.assetId);
      if (asset && asset.file) {
        const clipPath = path.join(PROJECTS_DIR, job.projectId, asset.file);
        if (fs.existsSync(clipPath) && !audioTracks.some(t => t.path === clipPath)) {
          audioTracks.push({
            id: clip.id,
            type: clip.type || 'music',
            path: clipPath,
            startTime: clip.startTime || 0,
            duration: clip.duration,
            volume: clip.volume ?? (clip.type === 'voice' ? 1.0 : 0.25)
          });
        }
      }
    }

    // 3. Background music
    if (project.audio?.musicAssetId) {
      const audioAsset = (project.assets || []).find(a => a.id === project.audio.musicAssetId);
      if (audioAsset && audioAsset.file) {
        let candidateAudio = path.join(PROJECTS_DIR, job.projectId, audioAsset.file);
        if (!fs.existsSync(candidateAudio)) {
          const seedAudio = path.resolve('data/projects/easymoderator-launch', audioAsset.file);
          if (fs.existsSync(seedAudio)) {
            try {
              fs.mkdirSync(path.dirname(candidateAudio), { recursive: true });
              fs.copyFileSync(seedAudio, candidateAudio);
            } catch (_) {}
          }
        }
        if (fs.existsSync(candidateAudio)) {
          audioPath = candidateAudio;
          job.logs.push(`Mixing music track: ${audioAsset.file}`);
        }
      }
    }
  }

  try {
    const renderResult = await renderVideo({
      compositionHtml: comp.html,
      target: comp.target,
      totalFrames: comp.totalFrames,
      totalDuration: comp.totalDuration,
      outputPath: job.outputPath,
      audioTracks,
      audioPath,
      audioConfig: project.audio || {},
      tempParentDir: RENDERS_DIR,
      signal,
      onProgress: p => {
        job.currentFrame = p.currentFrame;
        job.percent = p.percent;
        job.progress = p.percent;
        if (p.currentFrame % 25 === 0 || p.currentFrame === p.totalFrames) {
          job.logs.push(`Frame ${p.currentFrame}/${p.totalFrames} (${p.percent}%)`);
          jobEmitter.emit(`job:${job.id}`, { ...job });
        }
      }
    });

    if (signal?.aborted || job.status === 'cancelled') {
      return;
    }

    job.status = 'verifying';
    job.logs.push('Verifying output MP4 with ffprobe...');
    jobEmitter.emit(`job:${job.id}`, { ...job });

    const probe = await probeMedia(job.outputPath);
    job.metadata = {
      ...probe,
      audioMetrics: renderResult.audioMetrics
    };
    if (renderResult.audioMetrics?.volume) {
      job.logs.push(`Audio volume verified: mean ${renderResult.audioMetrics.volume.meanVolumeDb} dB, max ${renderResult.audioMetrics.volume.maxVolumeDb} dB`);
    }

    // Verification checks
    if (probe.width !== comp.target.width || probe.height !== comp.target.height) {
      throw new Error(`Video dimension verification failed: expected ${comp.target.width}x${comp.target.height}, got ${probe.width}x${probe.height}`);
    }
    if (probe.videoCodec !== 'h264') {
      throw new Error(`Video codec verification failed: expected h264, got ${probe.videoCodec}`);
    }

    job.status = 'done';
    job.percent = 100;
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    job.logs.push(`Render complete and verified! Output: ${job.outputFileName} (${(probe.fileSize / 1024).toFixed(1)} KB)`);
    jobEmitter.emit(`job:${job.id}`, { ...job });
  } catch (err) {
    if (err.name === 'AbortError' || signal?.aborted) {
      job.status = 'cancelled';
      job.logs.push('Render cancelled and aborted.');
      jobEmitter.emit(`job:${job.id}`, { ...job });
      return;
    }
    throw err;
  }
}

// Start server if run directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const server = await buildServer();
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`Growth Studio server running at http://${HOST}:${PORT}`);
    console.log(`Storage root: ${storagePaths.root} (E: Drive: ${storagePaths.isEDrive})`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

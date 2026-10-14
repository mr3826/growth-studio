import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fs from 'node:fs';
import path from 'node:path';
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
  killProcessTree
} from '@kinetic-studio/render-adapter';

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

export async function buildServer() {
  const fastify = Fastify({
    logger: false,
    bodyLimit: 50 * 1024 * 1024 // 50MB
  });

  await fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      // Loopback/Local origin allowlist
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
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
        name: 'দোকানবট — বাংলা প্রমোশনাল স্টোরি (Reference-Style 4:5)',
        description: 'Reference-aligned Bengali kinetic typography, highlighted text, mobile & browser mockups, 8 structured chapters.',
        templateId: 'guided_product_story',
        language: 'bn'
      },
      {
        id: 'saas',
        name: 'CloudPulse SaaS Dashboard',
        description: 'B2B software telemetry showcase with metrics, funnels, and real-time dashboard mockup.',
        templateId: 'bold_kinetic',
        language: 'en'
      },
      {
        id: 'mobile',
        name: 'FlowPay Borderless Mobile App',
        description: 'Consumer mobile app demonstration with smartphone frame, spotlight zooms, and transaction UI.',
        templateId: 'app_showcase',
        language: 'en'
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
    fs.mkdirSync(path.join(targetDir, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'snapshots'), { recursive: true });

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

  // Locate optional audio
  let audioPath = null;
  if (!project.audio?.muteAll && project.audio?.musicAssetId) {
    const audioAsset = (project.assets || []).find(a => a.id === project.audio.musicAssetId);
    if (audioAsset && audioAsset.file) {
      const candidateAudio = path.join(PROJECTS_DIR, job.projectId, audioAsset.file);
      if (fs.existsSync(candidateAudio)) {
        audioPath = candidateAudio;
        job.logs.push(`Mixing audio track: ${audioAsset.file}`);
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
    job.metadata = probe;

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

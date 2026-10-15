import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback repo-relative data dir
const REPO_ROOT = path.resolve(__dirname, '../../../');
const REPO_FALLBACK_DATA_DIR = path.join(REPO_ROOT, 'data', 'growth-studio');

/**
 * Tests whether a directory or drive path is accessible and writable.
 */
export function isPathWritable(targetPath) {
  try {
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    const testFile = path.join(targetPath, `.canary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`);
    fs.writeFileSync(testFile, 'growth-studio-write-test', 'utf8');
    fs.unlinkSync(testFile);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Checks disk space using native Node.js statfsSync.
 */
export function getDiskSpace(targetPath) {
  try {
    // If path doesn't exist, stat parent
    let checkPath = targetPath;
    while (!fs.existsSync(checkPath) && path.dirname(checkPath) !== checkPath) {
      checkPath = path.dirname(checkPath);
    }
    const stats = fs.statfsSync(checkPath);
    const bsize = stats.bsize || 4096;
    const freeBytes = Number(stats.bfree) * bsize;
    const totalBytes = Number(stats.blocks) * bsize;
    return {
      available: true,
      freeBytes,
      totalBytes,
      freeGB: Number((freeBytes / (1024 ** 3)).toFixed(2)),
      totalGB: Number((totalBytes / (1024 ** 3)).toFixed(2))
    };
  } catch (err) {
    return {
      available: false,
      error: err.message,
      freeBytes: 0,
      totalBytes: 0,
      freeGB: 0,
      totalGB: 0
    };
  }
}

/**
 * Estimates disk space needed for a render job in bytes.
 * Conservative formula: ~2.5 MB/s for high-quality MP4 + piped buffer margin + 200MB baseline reserve.
 */
export function estimateRenderSpaceBytes(durationSeconds, width = 1080, height = 1920, fps = 30) {
  const pixelMultiplier = (width * height) / (1080 * 1920);
  const fpsMultiplier = fps / 30;
  const bytesPerSecond = 2.5 * 1024 * 1024 * pixelMultiplier * fpsMultiplier;
  const baseMargin = 200 * 1024 * 1024; // 200 MB baseline
  return Math.ceil((durationSeconds * bytesPerSecond) + baseMargin);
}

/**
 * Resolves the central storage root according to system priorities:
 * 1. Explicit argument or process.env.GROWTH_STUDIO_DATA_DIR
 * 2. E:\GrowthStudio if E: is mounted and writable (preferred storage on Windows)
 * 3. Repo-local fallback (D:\hexabyte_technologies\growth-studio\data\growth-studio)
 */
export function resolveStoragePaths(customRoot = null) {
  let rootDir = customRoot || process.env.GROWTH_STUDIO_DATA_DIR;

  if (!rootDir) {
    // Check if E: drive exists and is writable on Windows
    const eDriveRoot = process.platform === 'win32' ? 'E:\\GrowthStudio' : null;
    if (eDriveRoot && isPathWritable(eDriveRoot)) {
      rootDir = eDriveRoot;
    } else {
      rootDir = REPO_FALLBACK_DATA_DIR;
    }
  }

  const projectsDir = path.join(rootDir, 'projects');
  const rendersDir = path.join(rootDir, 'renders');
  const exportsDir = path.join(rootDir, 'exports');
  const cacheDir = path.join(rootDir, 'cache');
  const logsDir = path.join(rootDir, 'logs');
  const referencesDir = path.join(rootDir, 'references');

  return {
    root: rootDir,
    projects: projectsDir,
    renders: rendersDir,
    exports: exportsDir,
    cache: cacheDir,
    logs: logsDir,
    references: referencesDir,
    isEDrive: rootDir.toLowerCase().startsWith('e:'),
    getDiskSpace: () => getDiskSpace(rootDir)
  };
}

/**
 * Ensures all required subdirectories exist.
 */
export function ensureStorageDirectories(storagePaths = null) {
  const paths = storagePaths || resolveStoragePaths();
  for (const dir of [
    paths.root,
    paths.projects,
    paths.renders,
    paths.exports,
    paths.cache,
    paths.logs,
    paths.references
  ]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  return paths;
}

/**
 * Preflight storage check: ensures volume is writable and has sufficient free space
 * with at least a 2 GiB reserve buffer.
 */
export function preflightStorage(storagePaths, requiredBytes = 200 * 1024 * 1024) {
  const paths = storagePaths || resolveStoragePaths();
  const space = paths.getDiskSpace();

  if (!isPathWritable(paths.renders) || !isPathWritable(paths.exports)) {
    return {
      passed: false,
      error: `Storage paths are not writable: ${paths.root}`,
      space
    };
  }

  const reserveBytes = 2 * 1024 * 1024 * 1024; // 2 GiB reserve
  const totalNeeded = requiredBytes + reserveBytes;

  if (space.available && space.freeBytes < totalNeeded) {
    return {
      passed: false,
      error: `Insufficient disk space on ${paths.root}. Required: ${(totalNeeded / (1024**3)).toFixed(2)} GB (including 2GB safety reserve), Available: ${space.freeGB} GB.`,
      space
    };
  }

  return {
    passed: true,
    storageRoot: paths.root,
    freeGB: space.freeGB,
    estimatedNeededGB: Number((requiredBytes / (1024**3)).toFixed(3)),
    isEDrive: paths.isEDrive
  };
}

/**
 * Cleans temporary render directory safely without touching exports.
 */
export function cleanupRenderTemp(jobId, storagePaths = null) {
  if (!jobId) return;
  const paths = storagePaths || resolveStoragePaths();
  const jobTempDir = path.join(paths.renders, String(jobId));
  if (fs.existsSync(jobTempDir)) {
    try {
      fs.rmSync(jobTempDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Warning: Could not remove temporary render dir ${jobTempDir}:`, err.message);
    }
  }
}

/**
 * Returns path to persistent exports manifest JSON.
 */
export function getExportsManifestPath(storagePaths = null) {
  const paths = storagePaths || resolveStoragePaths();
  return path.join(paths.exports, 'exports-manifest.json');
}

/**
 * Loads persistent exports manifest from disk.
 */
export function loadExportsManifest(storagePaths = null) {
  const manifestPath = getExportsManifestPath(storagePaths);
  if (!fs.existsSync(manifestPath)) {
    return { version: '1.0.0', exports: [] };
  }
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || '1.0.0',
      exports: Array.isArray(parsed.exports) ? parsed.exports : []
    };
  } catch (err) {
    console.error('Failed to parse exports manifest:', err.message);
    return { version: '1.0.0', exports: [] };
  }
}

/**
 * Saves exports manifest atomically to disk.
 */
export function saveExportsManifest(storagePaths, manifest) {
  const manifestPath = getExportsManifestPath(storagePaths);
  const tempPath = `${manifestPath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(manifest, null, 2), 'utf8');
  fs.renameSync(tempPath, manifestPath);
}

/**
 * Records a completed or updated export job in the persistent manifest.
 */
export function recordExportInManifest(storagePaths, jobRecord) {
  const manifest = loadExportsManifest(storagePaths);
  const jobId = jobRecord.id || jobRecord.jobId;
  manifest.exports = manifest.exports.filter(e => e.jobId !== jobId);

  let fileSize = 0;
  if (jobRecord.metadata?.fileSize) {
    fileSize = jobRecord.metadata.fileSize;
  } else if (jobRecord.outputPath && fs.existsSync(jobRecord.outputPath)) {
    try {
      fileSize = fs.statSync(jobRecord.outputPath).size;
    } catch (_) {}
  }

  manifest.exports.unshift({
    jobId,
    projectId: jobRecord.projectId,
    targetId: jobRecord.targetId,
    outputFileName: jobRecord.outputFileName,
    outputPath: jobRecord.outputPath,
    fileSize,
    duration: jobRecord.metadata?.duration || 0,
    fps: jobRecord.metadata?.fps || 30,
    width: jobRecord.metadata?.width || 0,
    height: jobRecord.metadata?.height || 0,
    videoCodec: jobRecord.metadata?.videoCodec || 'h264',
    audioCodec: jobRecord.metadata?.audioCodec || 'aac',
    audioMetrics: jobRecord.metadata?.audioMetrics || null,
    status: jobRecord.status || 'done',
    createdAt: jobRecord.startedAt || new Date().toISOString(),
    completedAt: jobRecord.completedAt || new Date().toISOString()
  });

  saveExportsManifest(storagePaths, manifest);
}

/**
 * Returns all recorded exports for a specific project ID, sorted newest first.
 */
export function getProjectExports(storagePaths, projectId) {
  const manifest = loadExportsManifest(storagePaths);
  return manifest.exports.filter(e => e.projectId === projectId);
}

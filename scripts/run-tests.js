import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const eDrive = path.resolve('E:/GrowthStudio');
if (process.platform !== 'win32' || !fs.existsSync(eDrive)) {
  console.error('Growth Studio verification requires the configured E:\\GrowthStudio test volume.');
  process.exit(2);
}

const runsRoot = path.join(eDrive, 'test-runs');
fs.mkdirSync(runsRoot, { recursive: true });
const storageRoot = path.join(runsRoot, `v003-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
fs.mkdirSync(storageRoot, { recursive: false });

const args = process.argv.slice(2);
const targets = args.length
  ? args.map(item => path.resolve(item))
  : fs.readdirSync(path.resolve('tests'))
    .filter(name => name.endsWith('.test.js'))
    .sort()
    .map(name => path.resolve('tests', name));

const port = String(44000 + Math.floor(Math.random() * 10000));
console.log(`Isolated Growth Studio test data: ${storageRoot}`);
console.log(`Isolated local test port: ${port}`);

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...targets], {
  cwd: process.cwd(),
  env: { ...process.env, GROWTH_STUDIO_DATA_DIR: storageRoot, PORT: port },
  stdio: 'inherit',
  windowsHide: true
});

if (result.error) {
  console.error(`Unable to start tests: ${result.error.message}`);
  process.exit(2);
}
process.exitCode = result.status ?? 2;

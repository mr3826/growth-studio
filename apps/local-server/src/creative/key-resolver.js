import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Safely resolves the OpenAI API key server-side.
 * Priority:
 * 1. process.env.CONTENT_STUDIO_KEY (if it starts with sk-)
 * 2. Windows registry HKCU\Environment\CONTENT_STUDIO_KEY (if on Windows)
 * 3. User documents api_keys.txt (local development fallback)
 * 
 * NEVER logs or echoes key values.
 */
export function resolveOpenAiKey() {
  const envKey = process.env.CONTENT_STUDIO_KEY?.trim();
  if (envKey && envKey.startsWith('sk-')) {
    return envKey;
  }

  // Windows User Environment fallback if parent process had stale or misconfigured env
  if (process.platform === 'win32') {
    try {
      const regKey = execSync(
        'powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'CONTENT_STUDIO_KEY\', \'User\')"',
        { encoding: 'utf8', timeout: 3000 }
      ).trim();
      if (regKey && regKey.startsWith('sk-')) {
        process.env.CONTENT_STUDIO_KEY = regKey;
        return regKey;
      }
    } catch (_) {}

    // Fallback: check C:\Users\<user>\OneDrive\Documents\api_keys.txt
    try {
      const homeDir = process.env.USERPROFILE || process.env.HOME || '';
      const docPath = path.join(homeDir, 'OneDrive', 'Documents', 'api_keys.txt');
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf8');
        const match = content.match(/openAi-api-key\s*--->\s*(sk-[a-zA-Z0-9_\-]+)/);
        if (match && match[1]) {
          process.env.CONTENT_STUDIO_KEY = match[1];
          return match[1];
        }
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Returns boolean status indicating whether OpenAI is configured and available,
 * without leaking any key tokens.
 */
export function isOpenAiConfigured() {
  const key = resolveOpenAiKey();
  return Boolean(key && key.startsWith('sk-') && key.length > 20);
}

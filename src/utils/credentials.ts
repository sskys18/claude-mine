import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { debugError } from './errors.js';
import { EXEC_TIMEOUT_MS } from '../constants.js';

function execFileAsync(cmd: string, args: string[], options: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout) => {
      if (error) reject(error);
      else resolve(String(stdout));
    });
  });
}

export async function getCredentials(): Promise<string | null> {
  try {
    if (process.platform === 'darwin') {
      return await getCredentialsFromKeychain();
    }
    return await getCredentialsFromFile();
  } catch {
    return null;
  }
}

const ACCESS_TOKEN_RE = /"accessToken"\s*:\s*"(sk-ant-[^"]+)"/;

function extractAccessToken(raw: string): string | null {
  const trimmed = raw.trim();

  // Try direct JSON parse first
  try {
    const creds = JSON.parse(trimmed);
    return creds?.claudeAiOauth?.accessToken ?? null;
  } catch {
    // Not plain JSON
  }

  // Keychain may store hex-encoded data (possibly truncated)
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    try {
      const str = Buffer.from(trimmed, 'hex').toString('utf-8');
      const match = str.match(ACCESS_TOKEN_RE);
      if (match) return match[1];
    } catch {
      // Hex decode failed
    }
  }

  // Last resort: regex on raw string
  const match = trimmed.match(ACCESS_TOKEN_RE);
  return match ? match[1] : null;
}

async function getCredentialsFromKeychain(): Promise<string | null> {
  try {
    const result = await execFileAsync(
      'security',
      ['find-generic-password', '-s', 'Claude Code-credentials', '-w'],
      { encoding: 'utf-8', timeout: EXEC_TIMEOUT_MS }
    );

    const token = extractAccessToken(result);
    if (token) return token;

    debugError('keychain read', 'failed to extract access token');
    return await getCredentialsFromFile();
  } catch (e) {
    debugError('keychain read', e);
    return await getCredentialsFromFile();
  }
}

async function getCredentialsFromFile(): Promise<string | null> {
  try {
    const credPath = join(homedir(), '.claude', '.credentials.json');

    // Verify file permissions: reject if group/other have any access
    const fileStat = await stat(credPath);
    if ((fileStat.mode & 0o077) !== 0) {
      process.stderr.write(
        `[claude-mine] WARNING: ${credPath} has insecure permissions (${(fileStat.mode & 0o777).toString(8)}). Expected 0600.\n`
      );
    }

    const content = await readFile(credPath, 'utf-8');
    const creds = JSON.parse(content);
    return creds?.claudeAiOauth?.accessToken ?? null;
  } catch (e) {
    debugError('credentials file', e);
    return null;
  }
}

import { execFile } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { debugError } from './errors.js';
import { EXEC_TIMEOUT_MS } from '../constants.js';
import type { GitDiffStats } from '../types.js';

function execFileAsync(cmd: string, args: string[], options: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout) => {
      if (error) reject(error);
      else resolve(String(stdout));
    });
  });
}

export async function getGitBranch(cwd?: string): Promise<string | undefined> {
  if (!cwd) return undefined;

  // Validate cwd exists and is a directory
  try {
    if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  try {
    const result = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf-8',
      timeout: EXEC_TIMEOUT_MS,
    });
    return result.trim() || undefined;
  } catch (e) {
    debugError('git branch', e);
    return undefined;
  }
}

export async function getGitDiffStats(cwd?: string): Promise<GitDiffStats | undefined> {
  if (!cwd) return undefined;

  try {
    if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  try {
    let output: string;
    try {
      output = await execFileAsync('git', ['diff', '--shortstat', 'HEAD'], {
        cwd,
        encoding: 'utf-8',
        timeout: EXEC_TIMEOUT_MS,
      });
    } catch {
      // Fresh repo with no commits — fall back to index-only diff
      output = await execFileAsync('git', ['diff', '--shortstat'], {
        cwd,
        encoding: 'utf-8',
        timeout: EXEC_TIMEOUT_MS,
      });
    }

    const insertionsMatch = output.match(/(\d+) insertion/);
    const deletionsMatch = output.match(/(\d+) deletion/);
    const insertions = insertionsMatch ? parseInt(insertionsMatch[1], 10) : 0;
    const deletions = deletionsMatch ? parseInt(deletionsMatch[1], 10) : 0;

    if (insertions === 0 && deletions === 0) return undefined;
    return { insertions, deletions };
  } catch (e) {
    debugError('git diff stats', e);
    return undefined;
  }
}

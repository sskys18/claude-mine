#!/usr/bin/env node

import { join } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { isAbsolute } from 'node:path';

import type { StdinInput, RenderContext } from './types.js';
import { boldYellow } from './utils/colors.js';
import { getGitBranch, getGitDiffStats } from './utils/git.js';
import { translations } from './utils/i18n.js';
import { render } from './render/index.js';
import { debugError } from './utils/errors.js';
import { STDIN_TIMEOUT_MS } from './constants.js';

function isValidDirectory(p: string): boolean {
  if (!p || !isAbsolute(p)) return false;
  try {
    return existsSync(p) && statSync(p).isDirectory();
  } catch {
    return false;
  }
}

async function readStdin(): Promise<StdinInput | null> {
  try {
    const chunks: Buffer[] = [];
    const stdinRead = (async () => {
      for await (const chunk of process.stdin) {
        chunks.push(Buffer.from(chunk));
      }
    })();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('stdin timeout')), STDIN_TIMEOUT_MS)
    );
    await Promise.race([stdinRead, timeout]);
    const content = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(content) as StdinInput;
  } catch (e) {
    debugError('stdin read', e);
    return null;
  }
}

async function main(): Promise<void> {
  const stdin = await readStdin();

  if (!stdin) {
    console.log(boldYellow('⚠️ stdin'));
    return;
  }

  const validCwd = isValidDirectory(stdin.cwd ?? '') ? stdin.cwd : undefined;

  const [gitBranch, gitDiffStats] = await Promise.all([
    getGitBranch(validCwd),
    getGitDiffStats(validCwd),
  ]);

  const ctx: RenderContext = {
    stdin,
    gitBranch,
    gitDiffStats,
  };

  render(ctx, translations);
}

main().catch((e) => {
  debugError('main', e);
  console.log(boldYellow('⚠️'));
});

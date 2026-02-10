#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join, isAbsolute, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, statSync } from 'node:fs';

import type { StdinInput, Config, RenderContext } from './types.js';
import { DEFAULT_CONFIG } from './types.js';
import { boldYellow } from './utils/colors.js';
import { fetchUsageLimits } from './utils/api-client.js';
import { getGitBranch } from './utils/git.js';
import { translations } from './utils/i18n.js';
import { render } from './render/index.js';
import { debugError } from './utils/errors.js';
import { STDIN_TIMEOUT_MS } from './constants.js';

const CONFIG_PATH = join(homedir(), '.claude', 'claude-mine.local.json');

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

async function loadConfig(): Promise<Config> {
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    const userConfig = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function main(): Promise<void> {
  const [config, stdin] = await Promise.all([loadConfig(), readStdin()]);

  if (!stdin) {
    console.log(boldYellow('⚠️ stdin'));
    return;
  }

  const validCwd = isValidDirectory(stdin.cwd ?? '') ? stdin.cwd : undefined;

  const [gitBranch, rateLimits] = await Promise.all([
    getGitBranch(validCwd),
    fetchUsageLimits(config.cache.ttlSeconds),
  ]);

  const ctx: RenderContext = {
    stdin,
    config,
    gitBranch,
    rateLimits,
  };

  render(ctx, translations);
}

main().catch((e) => {
  debugError('main', e);
  console.log(boldYellow('⚠️'));
});

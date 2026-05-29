#!/usr/bin/env node
// Detached model-health probe. Spawned by the statusline when its cache is
// stale; hits the public Statuspage endpoints and writes the cache atomically.
// Runs out-of-band so the statusline render never waits on the network.

import { writeFileSync, renameSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { CodexUsage, HealthEntry, ModelHealth } from './types.js';
import {
  HEALTH_CACHE_PATH,
  HEALTH_ENDPOINTS,
  HEALTH_FETCH_TIMEOUT_MS,
  CODEX_SESSIONS_DIR,
} from './constants.js';

async function probe(url: string): Promise<HealthEntry | undefined> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), HEALTH_FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(to);
    if (!res.ok) return undefined;
    const j = (await res.json()) as { status?: { indicator?: string; description?: string }; indicator?: string; description?: string };
    const s = j?.status ?? j;
    if (!s || typeof s.indicator !== 'string') return undefined;
    return {
      indicator: s.indicator,
      description: typeof s.description === 'string' ? s.description : undefined,
    };
  } catch {
    return undefined;
  }
}

/** Recursively collect rollout-*.jsonl paths under the codex sessions tree. */
function findRollouts(dir: string, out: string[], depth: number): void {
  if (depth > 4) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) findRollouts(p, out, depth + 1);
    else if (e.isFile() && e.name.startsWith('rollout-') && e.name.endsWith('.jsonl')) out.push(p);
  }
}

/** Deep-find a rate_limits object inside an arbitrary parsed JSON value. */
function findRateLimits(v: unknown): { primary?: { used_percent?: number; resets_at?: number }; secondary?: { used_percent?: number; resets_at?: number }; plan_type?: string } | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  if (o.rate_limits && typeof o.rate_limits === 'object') return o.rate_limits as never;
  for (const key of Object.keys(o)) {
    const hit = findRateLimits(o[key]);
    if (hit) return hit;
  }
  return undefined;
}

/** Read the newest codex rollout and pull the last rate_limits snapshot. */
function readCodexUsage(): CodexUsage | undefined {
  try {
    const files: string[] = [];
    findRollouts(CODEX_SESSIONS_DIR, files, 0);
    if (!files.length) return undefined;
    // Filenames are ISO-timestamped, so lexical max == newest.
    files.sort();
    const newest = files[files.length - 1]!;
    let asOf: number | undefined;
    try {
      asOf = statSync(newest).mtimeMs;
    } catch {
      asOf = undefined;
    }
    const lines = readFileSync(newest, 'utf-8').split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]!;
      if (!line.includes('"rate_limits"')) continue;
      try {
        const rl = findRateLimits(JSON.parse(line));
        if (!rl) continue;
        return {
          primary: typeof rl.primary?.used_percent === 'number' ? rl.primary.used_percent : undefined,
          secondary: typeof rl.secondary?.used_percent === 'number' ? rl.secondary.used_percent : undefined,
          primaryResetsAt: typeof rl.primary?.resets_at === 'number' ? rl.primary.resets_at : undefined,
          secondaryResetsAt: typeof rl.secondary?.resets_at === 'number' ? rl.secondary.resets_at : undefined,
          plan: typeof rl.plan_type === 'string' ? rl.plan_type : undefined,
          asOf,
        };
      } catch {
        // malformed line — keep scanning older lines
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function main(): Promise<void> {
  const [claude, codex] = await Promise.all([
    probe(HEALTH_ENDPOINTS.claude),
    probe(HEALTH_ENDPOINTS.codex),
  ]);
  const codexUsage = readCodexUsage();
  const data: ModelHealth = { ts: Date.now(), claude, codex, codexUsage };
  const tmp = `${HEALTH_CACHE_PATH}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data));
  renameSync(tmp, HEALTH_CACHE_PATH);
}

main().catch(() => process.exit(0));

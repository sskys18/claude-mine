import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ModelHealth } from '../types.js';
import { HEALTH_CACHE_PATH, HEALTH_TTL_MS, HEALTH_LOCK_PATH, HEALTH_LOCK_MS } from '../constants.js';
import { debugError } from './errors.js';

/** Read the cached probe result. Returns null when missing or unparseable. */
export function readHealth(): ModelHealth | null {
  try {
    if (!existsSync(HEALTH_CACHE_PATH)) return null;
    const raw = readFileSync(HEALTH_CACHE_PATH, 'utf-8');
    return JSON.parse(raw) as ModelHealth;
  } catch (e) {
    debugError('health read', e);
    return null;
  }
}

/**
 * If the cache is missing or older than the TTL, fire the probe in a detached
 * child and return immediately. The current render uses whatever is cached now;
 * the next render picks up the refreshed value. Never blocks on the network.
 */
export function maybeRefreshHealth(cache: ModelHealth | null): void {
  try {
    let fresh = false;
    if (cache && typeof cache.ts === 'number') {
      fresh = Date.now() - cache.ts < HEALTH_TTL_MS;
    } else if (existsSync(HEALTH_CACHE_PATH)) {
      // Corrupt/partial file with a recent mtime: don't thrash the probe.
      fresh = Date.now() - statSync(HEALTH_CACHE_PATH).mtimeMs < HEALTH_TTL_MS;
    }
    if (fresh) return;

    // Thundering-herd guard: a recent lock means another session already fired
    // a probe within this window — skip so only one network round-trip happens.
    try {
      if (existsSync(HEALTH_LOCK_PATH) && Date.now() - statSync(HEALTH_LOCK_PATH).mtimeMs < HEALTH_LOCK_MS) {
        return;
      }
      writeFileSync(HEALTH_LOCK_PATH, String(Date.now()));
    } catch (e) {
      debugError('health lock', e);
    }

    const probePath = join(dirname(fileURLToPath(import.meta.url)), 'health-probe.js');
    if (!existsSync(probePath)) return;
    const child = spawn(process.execPath, [probePath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch (e) {
    debugError('health refresh', e);
  }
}

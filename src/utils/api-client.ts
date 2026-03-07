import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { UsageLimits } from '../types.js';
import { getCredentials } from './credentials.js';
import { debugError } from './errors.js';
import { API_TIMEOUT_MS } from '../constants.js';

const CACHE_DIR = path.join(os.homedir(), '.claude');
const CACHE_FILE = path.join(CACHE_DIR, 'claude-mine-cache.json');
const LOCK_FILE = path.join(CACHE_DIR, 'claude-mine-cache.lock');

/** Backoff time in seconds after a 429 — don't hit the API again during this window */
const BACKOFF_SECONDS = 300;
/** Max age of lock file before considering it stale (process died without releasing) */
const LOCK_MAX_AGE_MS = 30_000;

interface CacheEntry {
  data: UsageLimits | null;
  timestamp: number;
  /** If set, indicates the cache was saved due to an error (e.g. 429 backoff) */
  backoff?: boolean;
}

export type FetchError = 'no_key' | 'rate_limited' | 'api_error' | null;

export interface FetchResult {
  limits: UsageLimits | null;
  stale: boolean;
  error: FetchError;
}

let usageCache: CacheEntry | null = null;

function isCacheValid(ttlSeconds: number): boolean {
  if (!usageCache) return false;
  const ageSeconds = (Date.now() - usageCache.timestamp) / 1000;
  return ageSeconds < ttlSeconds;
}

function loadFileCache(): CacheEntry | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const content = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    if (content && typeof content.timestamp === 'number') {
      return {
        data: content.data as UsageLimits | null,
        timestamp: content.timestamp,
        backoff: content.backoff ?? false,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function saveFileCache(data: UsageLimits | null, backoff = false): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 });
    }
    const tmpFile = CACHE_FILE + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify({ data, timestamp: Date.now(), backoff }), { mode: 0o600 });
    fs.renameSync(tmpFile, CACHE_FILE);
  } catch (e) {
    debugError('cache write', e);
  }
}

/**
 * Try to acquire an exclusive lock file. Returns true if this process won the lock.
 * Uses `wx` flag (O_CREAT | O_EXCL) which is atomic on POSIX — only one process succeeds.
 */
function acquireLock(): boolean {
  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx', mode: 0o600 });
    return true;
  } catch (e: any) {
    if (e?.code !== 'EEXIST') return false;
    // Lock exists — check if it's stale
    try {
      const stat = fs.statSync(LOCK_FILE);
      if (Date.now() - stat.mtimeMs > LOCK_MAX_AGE_MS) {
        // Stale lock (process likely died) — remove and retry once
        fs.unlinkSync(LOCK_FILE);
        try {
          fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx', mode: 0o600 });
          return true;
        } catch {
          return false;
        }
      }
    } catch {
      // Can't stat or unlink — another process beat us, that's fine
    }
    return false;
  }
}

function releaseLock(): void {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch {
    // Already removed or never created — safe to ignore
  }
}

export async function fetchUsageLimits(ttlSeconds = 300): Promise<FetchResult> {
  // In-memory cache (same process)
  if (isCacheValid(ttlSeconds) && usageCache) {
    if (usageCache.backoff) {
      return { limits: null, stale: false, error: 'rate_limited' };
    }
    return { limits: usageCache.data, stale: false, error: null };
  }

  // Disk cache (cross-process) — check freshness
  const diskEntry = loadFileCache();
  if (diskEntry) {
    const ageSeconds = (Date.now() - diskEntry.timestamp) / 1000;

    // Fresh cache (within TTL) — use it directly
    if (ageSeconds < ttlSeconds) {
      usageCache = diskEntry;
      if (diskEntry.backoff) {
        return { limits: null, stale: false, error: 'rate_limited' };
      }
      return { limits: diskEntry.data, stale: false, error: null };
    }

    // Stale cache with real data — we'll try API but can fall back
  }

  // Thundering herd prevention: only one process fetches, others use stale cache
  if (!acquireLock()) {
    // Another process is already fetching — return stale data
    if (diskEntry?.data) {
      usageCache = diskEntry;
      return { limits: diskEntry.data, stale: true, error: null };
    }
    return { limits: null, stale: false, error: null };
  }

  // Re-check disk cache after acquiring lock — another process may have just written fresh data
  const freshCheck = loadFileCache();
  if (freshCheck) {
    const freshAge = (Date.now() - freshCheck.timestamp) / 1000;
    if (freshAge < ttlSeconds) {
      releaseLock();
      usageCache = freshCheck;
      if (freshCheck.backoff) {
        return { limits: null, stale: false, error: 'rate_limited' };
      }
      return { limits: freshCheck.data, stale: false, error: null };
    }
  }

  let token: string | null = await getCredentials();
  if (!token) {
    releaseLock();
    return { limits: null, stale: false, error: 'no_key' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'claude-mine/1.0.0',
        Authorization: `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
      signal: controller.signal,
    });

    token = null;
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        debugError('API rate limited (429)', retryAfter ? `Retry-After: ${retryAfter}s` : 'no Retry-After header');

        // Save backoff marker so subsequent statusline invocations don't hammer the API
        saveFileCache(diskEntry?.data ?? null, true);
        releaseLock();

        if (diskEntry?.data) {
          return { limits: diskEntry.data, stale: true, error: null };
        }
        return { limits: null, stale: false, error: 'rate_limited' };
      }
      // 401, 403, etc. — genuine auth issues
      releaseLock();
      return { limits: null, stale: false, error: 'api_error' };
    }

    const data = await response.json();

    const limits: UsageLimits = {
      five_hour: data.five_hour,
      seven_day: data.seven_day,
      seven_day_sonnet: data.seven_day_sonnet,
    };

    usageCache = { data: limits, timestamp: Date.now() };
    saveFileCache(limits);
    releaseLock();

    return { limits, stale: false, error: null };
  } catch (e) {
    token = null;
    debugError('API fetch', e);

    // Network error / timeout — save backoff + fall back to stale
    saveFileCache(diskEntry?.data ?? null, true);
    releaseLock();

    if (diskEntry?.data) {
      return { limits: diskEntry.data, stale: true, error: null };
    }
    return { limits: null, stale: false, error: 'api_error' };
  }
}

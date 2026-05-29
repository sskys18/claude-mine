import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';

/** Token buffer added to current usage to account for autocompact overhead */
export const AUTOCOMPACT_BUFFER = 45000;

/** Timeout for stdin reading in milliseconds */
export const STDIN_TIMEOUT_MS = 5000;

/** Timeout for external process calls (git, security keychain) in milliseconds */
export const EXEC_TIMEOUT_MS = 3000;

/** Timeout for API requests in milliseconds */
export const API_TIMEOUT_MS = 5000;

/** Cached model-health file written by the detached probe, read per-render. */
export const HEALTH_CACHE_PATH = join(tmpdir(), 'claude-statusline-health.json');

/**
 * Spawn lock. Shared across every session: before launching a probe, a render
 * touches this file; concurrent renders within HEALTH_LOCK_MS see the fresh
 * mtime and skip, so only one probe fires even when many sessions render at the
 * same stale instant (thundering-herd guard).
 */
export const HEALTH_LOCK_PATH = join(tmpdir(), 'claude-statusline-health.lock');
export const HEALTH_LOCK_MS = 15_000;

/** Re-probe model health only when the cache is older than this. */
export const HEALTH_TTL_MS = 120_000;

/** Codex CLI session rollout root (default CODEX_HOME); holds rate_limits events. */
export const CODEX_SESSIONS_DIR = join(homedir(), '.codex', 'sessions');

/** Per-request timeout for the status probe. */
export const HEALTH_FETCH_TIMEOUT_MS = 4000;

/**
 * Public Statuspage endpoints (no auth, no token cost).
 * - claude: anthropic.statuspage.io returns the status object directly with no
 *   redirect (status.anthropic.com 301s to a schema-doc page that is unusable).
 * - codex: Codex CLI runs on the OpenAI API, so OpenAI's status is the model
 *   health signal.
 */
export const HEALTH_ENDPOINTS = {
  claude: 'https://anthropic.statuspage.io/api/v2/status.json',
  codex: 'https://status.openai.com/api/v2/status.json',
} as const;

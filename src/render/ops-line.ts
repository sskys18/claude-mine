import type { RenderContext, HealthEntry } from '../types.js';
import {
  COLORS,
  colorize,
  gray,
  getColorForPercent,
} from '../utils/colors.js';
import { formatPercent, formatTimeLeft } from '../utils/formatters.js';

const SEP = ` ${gray('│')} `;

/** Codex rate-limit snapshots older than this read as stale (5h window + slack). */
const CODEX_USAGE_STALE_MS = 6 * 60 * 60 * 1000;

function indicatorColor(indicator?: string): string {
  switch (indicator) {
    case 'none':
    case 'operational':
      return COLORS.boldGreen;
    case 'minor':
      return COLORS.boldYellow;
    case 'major':
    case 'critical':
      return COLORS.boldRed;
    default:
      return COLORS.gray; // unknown / stale / not yet probed
  }
}

function healthDot(label: string, entry?: HealthEntry): string {
  return `${colorize('●', indicatorColor(entry?.indicator))} ${gray(label)}`;
}

/** "29% (2h13m)" — used % colored by level, plus time until the window resets. */
function limit(percent: number, resetsAtSec: number | undefined, nowMs: number, dim: boolean): string {
  const pctStr = dim ? gray(formatPercent(percent)) : colorize(formatPercent(percent), getColorForPercent(percent));
  if (typeof resetsAtSec === 'number') return `${pctStr} ${gray(`(${formatTimeLeft(resetsAtSec, nowMs)})`)}`;
  return pctStr;
}

/** Claude line: service health + account limits (5h / weekly) with time-to-reset. */
export function renderClaudeLine(ctx: RenderContext): string {
  const parts: string[] = [];
  const now = Date.now();

  parts.push(healthDot('claude', ctx.health?.claude));

  const rl = ctx.stdin.rate_limits;
  if (rl?.five_hour?.used_percentage != null) {
    parts.push(`${gray('5h')} ${limit(rl.five_hour.used_percentage, rl.five_hour.resets_at, now, false)}`);
  }
  if (rl?.seven_day?.used_percentage != null) {
    parts.push(`${gray('7d')} ${limit(rl.seven_day.used_percentage, rl.seven_day.resets_at, now, false)}`);
  }

  return parts.join(SEP);
}

/**
 * Codex line: OpenAI service health + Codex usage (5h / weekly) with time-to-
 * reset, plus the installed codex CLI version. Usage reflects the last codex
 * run, not live — when the source snapshot is old it is dimmed and marked
 * `stale` so it doesn't read as current.
 */
export function renderCodexLine(ctx: RenderContext): string {
  const parts: string[] = [];
  const now = Date.now();

  parts.push(healthDot('codex', ctx.health?.codex));

  const cu = ctx.health?.codexUsage;
  if (cu && (cu.primary != null || cu.secondary != null)) {
    const stale = typeof cu.asOf === 'number' && now - cu.asOf > CODEX_USAGE_STALE_MS;
    if (cu.primary != null) parts.push(`${gray('5h')} ${limit(cu.primary, cu.primaryResetsAt, now, stale)}`);
    if (cu.secondary != null) parts.push(`${gray('7d')} ${limit(cu.secondary, cu.secondaryResetsAt, now, stale)}`);
    if (stale) parts.push(gray('stale'));
  }

  return parts.join(SEP);
}

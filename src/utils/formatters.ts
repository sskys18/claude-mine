export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

export function shortenModelName(name: string): string {
  return name.replace(/^Claude\s*/i, '').trim();
}

export function formatCost(usd: number): string {
  if (usd >= 100) return `$${usd.toFixed(0)}`;
  if (usd >= 10) return `$${usd.toFixed(1)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h${rm}m` : `${h}h`;
}

export function formatPercent(p: number): string {
  return `${Math.round(p)}%`;
}

/** Minute-granularity elapsed: "7m" or "1h7m" (no seconds). */
export function formatMinutes(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h${rm}m` : `${h}h`;
}

/** Compact "time until" for an epoch-seconds reset point. e.g. 2h13m, 6d12h, 45m. */
export function formatTimeLeft(resetsAtSec: number, nowMs: number): string {
  const sec = Math.round(resetsAtSec - nowMs / 1000);
  if (sec <= 0) return 'due';
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m || 1}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm ? `${h}h${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d${rh}h` : `${d}d`;
}

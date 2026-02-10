export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

export function formatResetDate(resetAt: string): string {
  const d = new Date(resetAt);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  let hour = d.getHours();
  const ampm = hour >= 12 ? 'pm' : 'am';
  hour = hour % 12 || 12;
  return `${month}/${day} ${hour}${ampm}`;
}

export function formatCountdown(resetAt: string): string {
  const now = Date.now();
  const resetMs = new Date(resetAt).getTime();
  const diffMs = resetMs - now;
  if (diffMs <= 0) return '0m';
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${remainingHours}h`;
  if (hours > 0) return `${hours}h${minutes.toString().padStart(2, '0')}m`;
  return `${minutes}m`;
}

export function shortenModelName(name: string): string {
  return name.replace(/^Claude\s*/i, '').trim();
}

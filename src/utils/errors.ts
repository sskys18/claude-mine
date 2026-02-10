const IS_DEBUG = process.env.CLAUDE_HUD_DEBUG === '1';

export function debugError(context: string, error: unknown): void {
  if (!IS_DEBUG) return;
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[claude-mine] ${context}: ${msg}\n`);
}

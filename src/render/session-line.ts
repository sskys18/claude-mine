import type { RenderContext, Translations } from '../types.js';
import { colorize, gray, boldWhite, boldYellow, boldCyan, getColorForPercent } from '../utils/colors.js';
import { formatTokens, shortenModelName, formatDuration, formatMinutes } from '../utils/formatters.js';
import { AUTOCOMPACT_BUFFER } from '../constants.js';

const SEP = ` ${gray('│')} `;

export function renderSessionLine(ctx: RenderContext, t: Translations): string {
  const parts: string[] = [];

  const modelName = shortenModelName(ctx.stdin.model.display_name);
  parts.push(boldWhite(modelName));

  const usage = ctx.stdin.context_window.current_usage;
  if (usage) {
    // Autocompact-aware: count the buffer CC reserves before it compacts. This
    // deliberately diverges from the payload's used_percentage (raw usage).
    const baseTokens = usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens;
    const totalTokens = ctx.stdin.context_window.context_window_size;
    const currentTokens = baseTokens + AUTOCOMPACT_BUFFER;
    const percent = Math.min(100, Math.round((currentTokens / totalTokens) * 100));
    const percentColor = getColorForPercent(percent);
    parts.push(`${gray(`${formatTokens(currentTokens)}/${formatTokens(totalTokens)}`)} ${colorize(`${percent}%`, percentColor)}`);
  } else {
    parts.push(gray(t.errors.no_context));
  }

  if (ctx.stdin.fast_mode) parts.push(boldYellow('fast'));

  const style = ctx.stdin.output_style?.name;
  if (style && style !== 'default') parts.push(boldCyan(style));

  // Live session timer: real elapsed since the transcript was created (ticks
  // with refreshInterval, even while idle). Falls back to the API's
  // total_duration_ms only when the transcript birthtime is unavailable.
  if (ctx.sessionStartMs) {
    parts.push(boldWhite(formatMinutes(Date.now() - ctx.sessionStartMs)));
  } else if (typeof ctx.stdin.cost?.total_duration_ms === 'number') {
    parts.push(boldWhite(formatDuration(ctx.stdin.cost.total_duration_ms)));
  }

  return parts.join(SEP);
}

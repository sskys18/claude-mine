import type { RenderContext, Translations } from '../types.js';
import { COLORS, RESET, colorize, gray, boldWhite, boldBlue, getColorForPercent } from '../utils/colors.js';
import { formatTokens, formatCountdown, shortenModelName } from '../utils/formatters.js';
import { AUTOCOMPACT_BUFFER } from '../constants.js';

const SEP = ` ${COLORS.gray}│${RESET} `;

export function renderSessionLine(ctx: RenderContext, t: Translations): string {
  const parts: string[] = [];

  const modelName = shortenModelName(ctx.stdin.model.display_name);
  parts.push(boldWhite(modelName));

  const usage = ctx.stdin.context_window.current_usage;
  if (!usage) {
    parts.push(gray(t.errors.no_context));
    return parts.join(SEP);
  }

  const baseTokens = usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens;
  const totalTokens = ctx.stdin.context_window.context_window_size;
  const currentTokens = baseTokens + AUTOCOMPACT_BUFFER;
  const percent = Math.min(100, Math.round((currentTokens / totalTokens) * 100));

  const percentColor = getColorForPercent(percent);
  parts.push(`${gray(`${formatTokens(currentTokens)}/${formatTokens(totalTokens)}`)} ${colorize(`${percent}%`, percentColor)}`);

  // Append 5h rate limit to the same line
  const fiveHourSection = buildFiveHourSection(ctx, t);
  if (fiveHourSection) {
    parts.push(fiveHourSection);
  }

  return parts.join(SEP);
}

function buildFiveHourSection(ctx: RenderContext, t: Translations): string | null {
  const limits = ctx.rateLimits;
  if (!limits) return colorize('? no key', COLORS.boldYellow);
  if (!limits.five_hour) return null;

  const pct = Math.round(limits.five_hour.utilization);
  const countdown = limits.five_hour.resets_at ? formatCountdown(limits.five_hour.resets_at) : '';

  if (pct <= 5) {
    // Clean usage: show only hourglass + countdown
    return countdown ? gray(`⏳ ${countdown}`) : null;
  }

  // Notable usage: show pct + countdown (no label)
  const color = getColorForPercent(pct);
  let text = colorize(`${pct}%`, color);
  if (countdown) {
    text += gray(`(${countdown})`);
  }
  return text;
}

export function renderRateLimitsLine(ctx: RenderContext, t: Translations): string {
  const limits = ctx.rateLimits;
  if (!limits) return '';

  // Only show 7d + Sonnet on this line (5h is now on line 1)
  if (!limits.seven_day && !limits.seven_day_sonnet) return '';

  const parts: string[] = [];

  if (limits.seven_day) {
    const pct = Math.round(limits.seven_day.utilization);
    const color = getColorForPercent(pct);
    const cd = limits.seven_day.resets_at ? formatCountdown(limits.seven_day.resets_at) : '~~';
    parts.push(`${boldBlue(t.labels['7d'])}: ${colorize(`${pct}%`, color)}${gray(`(${cd})`)}`);
  }

  if (limits.seven_day_sonnet) {
    const pct = Math.round(limits.seven_day_sonnet.utilization);
    const color = getColorForPercent(pct);
    const cd = limits.seven_day_sonnet.resets_at ? formatCountdown(limits.seven_day_sonnet.resets_at) : '~~';
    parts.push(`${boldBlue('S')}: ${colorize(`${pct}%`, color)}${gray(`(${cd})`)}`);
  }

  return parts.join(SEP);
}

import type { RenderContext, Translations } from '../types.js';
import { colorize, gray, boldWhite, getColorForPercent } from '../utils/colors.js';
import { formatTokens, shortenModelName } from '../utils/formatters.js';
import { AUTOCOMPACT_BUFFER } from '../constants.js';

const SEP = ` ${gray('│')} `;

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

  return parts.join(SEP);
}

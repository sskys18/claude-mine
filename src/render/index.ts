import type { RenderContext, Translations } from '../types.js';
import { RESET } from '../utils/colors.js';
import { renderSessionLine, renderRateLimitsLine } from './session-line.js';
import { renderProjectLine } from './project-line.js';
export function render(ctx: RenderContext, t: Translations): void {
  const lines = [
    renderSessionLine(ctx, t),
    renderRateLimitsLine(ctx, t),
    renderProjectLine(ctx),
  ].filter(Boolean);

  for (const line of lines) {
    console.log(`${RESET}${line.replace(/ /g, '\u00A0')}`);
  }
}

import type { RenderContext, Translations } from '../types.js';
import { RESET } from '../utils/colors.js';
import { renderSessionLine } from './session-line.js';
import { renderProjectLine } from './project-line.js';
import { renderClaudeLine, renderCodexLine } from './ops-line.js';
export function render(ctx: RenderContext, t: Translations): void {
  const lines = [
    renderSessionLine(ctx, t),
    renderProjectLine(ctx),
    renderClaudeLine(ctx),
    renderCodexLine(ctx),
  ].filter(Boolean);

  for (const line of lines) {
    // Spaces -> non-breaking so the status line never wraps mid-segment.
    console.log(`${RESET}${line.replace(/ /g, ' ')}`);
  }
}

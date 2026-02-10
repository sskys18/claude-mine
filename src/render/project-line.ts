import path from 'node:path';
import type { RenderContext } from '../types.js';
import { boldYellow, boldCyan, magenta } from '../utils/colors.js';

export function renderProjectLine(ctx: RenderContext): string {
  if (!ctx.stdin.cwd) return '';

  const projectName = path.basename(ctx.stdin.cwd) || ctx.stdin.cwd;
  let line = boldYellow(projectName);

  if (ctx.gitBranch) {
    line += ` ${magenta('git:(')}${boldCyan(ctx.gitBranch)}${magenta(')')}`;
  }

  return line;
}

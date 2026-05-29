import path from 'node:path';
import type { RenderContext } from '../types.js';
import { boldYellow, boldCyan, boldGreen, boldRed, magenta, gray } from '../utils/colors.js';

export function renderProjectLine(ctx: RenderContext): string {
  if (!ctx.stdin.cwd) return '';

  const projectName = path.basename(ctx.stdin.cwd) || ctx.stdin.cwd;
  let line = boldYellow(projectName);

  if (ctx.gitBranch) {
    line += ` ${magenta('git:(')}${boldCyan(ctx.gitBranch)}${magenta(')')}`;
  }

  if (ctx.gitDiffStats) {
    line += ` ${boldGreen(`+${ctx.gitDiffStats.insertions}`)}, ${boldRed(`-${ctx.gitDiffStats.deletions}`)}`;
  }

  const repo = ctx.stdin.workspace?.repo;
  if (repo?.owner && repo?.name) {
    line += ` ${gray('·')} ${gray(`${repo.owner}/${repo.name}`)}`;
  }

  // sspower flow stage for this cwd (flow.sh SSOT, 6 stages). Blank when idle.
  if (ctx.flow?.stage) {
    const f = ctx.flow;
    const pos = f.index ? ` ${f.index}/${f.total}` : '';
    line += ` ${gray('·')} ${magenta('◆ flow')} ${boldCyan(`${f.stage}${pos}`)}`;
  }

  return line;
}

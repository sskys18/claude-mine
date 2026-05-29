import { readFileSync, existsSync } from 'node:fs';
import type { FlowState } from '../types.js';
import { SSPOWER_FLOW_STATE, SSPOWER_FLOW_STAGES } from '../constants.js';
import { debugError } from './errors.js';

/**
 * Read the live sspower flow for the given cwd. Read every render (not cached):
 * the flow advances mid-session and the file is tiny + local. Returns null when
 * sspower isn't present or no flow is active here.
 */
export function readFlow(cwd?: string): FlowState | null {
  if (!cwd) return null;
  try {
    if (!existsSync(SSPOWER_FLOW_STATE)) return null;
    const doc = JSON.parse(readFileSync(SSPOWER_FLOW_STATE, 'utf-8')) as {
      flows?: Record<string, { stage?: string; task?: string }>;
    };
    const entry = doc.flows?.[cwd];
    const stage = entry?.stage;
    if (!stage) return null;
    const idx = (SSPOWER_FLOW_STAGES as readonly string[]).indexOf(stage);
    return {
      stage,
      index: idx >= 0 ? idx + 1 : 0,
      total: SSPOWER_FLOW_STAGES.length,
      task: entry?.task || undefined,
    };
  } catch (e) {
    debugError('sspower flow read', e);
    return null;
  }
}

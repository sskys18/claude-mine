export interface StdinInput {
  model: {
    display_name: string;
    id?: string;
  };
  context_window: {
    context_window_size: number;
    used_percentage?: number;
    remaining_percentage?: number;
    current_usage?: {
      input_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
      output_tokens?: number;
    };
  };
  cost: {
    total_cost_usd: number;
    total_duration_ms?: number;
    total_api_duration_ms?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  cwd?: string;
  transcript_path?: string;
  session_name?: string;
  version?: string;
  output_style?: { name?: string };
  effort?: { level?: string };
  thinking?: { enabled?: boolean };
  fast_mode?: boolean;
  exceeds_200k_tokens?: boolean;
  workspace?: {
    current_dir?: string;
    project_dir?: string;
    git_worktree?: string;
    repo?: { host?: string; owner?: string; name?: string };
  };
  rate_limits?: {
    five_hour?: { used_percentage?: number; resets_at?: number };
    seven_day?: { used_percentage?: number; resets_at?: number };
  };
}

export interface GitDiffStats {
  insertions: number;
  deletions: number;
}

export interface HealthEntry {
  indicator: string;
  description?: string;
}

export interface CodexUsage {
  /** 5h rolling window used %. */
  primary?: number;
  /** weekly window used %. */
  secondary?: number;
  plan?: string;
  /** epoch seconds when the 5h / weekly windows reset. */
  primaryResetsAt?: number;
  secondaryResetsAt?: number;
  /** mtime (ms) of the rollout this snapshot came from — for staleness. */
  asOf?: number;
}

export interface ModelHealth {
  ts: number;
  claude?: HealthEntry;
  codex?: HealthEntry;
  codexUsage?: CodexUsage;
}

export interface FlowState {
  stage: string;
  index: number;
  total: number;
  task?: string;
}

export interface RenderContext {
  stdin: StdinInput;
  gitBranch?: string;
  gitDiffStats?: GitDiffStats;
  health?: ModelHealth | null;
  flow?: FlowState | null;
  /** Real session start (transcript birthtime, ms) for a live wall-clock timer. */
  sessionStartMs?: number;
}

export interface Translations {
  errors: {
    no_context: string;
  };
}

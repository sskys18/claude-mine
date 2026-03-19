export interface StdinInput {
  model: {
    display_name: string;
  };
  context_window: {
    context_window_size: number;
    current_usage?: {
      input_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    };
  };
  cost: {
    total_cost_usd: number;
  };
  cwd?: string;
  transcript_path?: string;
}

export interface GitDiffStats {
  insertions: number;
  deletions: number;
}

export interface RenderContext {
  stdin: StdinInput;
  gitBranch?: string;
  gitDiffStats?: GitDiffStats;
}

export interface Translations {
  errors: {
    no_context: string;
  };
}

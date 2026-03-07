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

export interface Config {
  plan: 'pro' | 'max100' | 'max200';
  cache: {
    ttlSeconds: number;
  };
}

export const DEFAULT_CONFIG: Config = {
  plan: 'max200',
  cache: {
    ttlSeconds: 300,
  },
};

export interface RateLimitInfo {
  utilization: number;
  resets_at?: string;
}

export interface UsageLimits {
  five_hour?: RateLimitInfo;
  seven_day?: RateLimitInfo;
  seven_day_sonnet?: RateLimitInfo;
}

export type RateLimitError = 'no_key' | 'rate_limited' | 'api_error' | null;

export interface RenderContext {
  stdin: StdinInput;
  config: Config;
  gitBranch?: string;
  rateLimits: UsageLimits | null;
  rateLimitsStale: boolean;
  rateLimitError: RateLimitError;
}

export interface Translations {
  labels: {
    '5h': string;
    '7d': string;
    '7d_all': string;
    '7d_sonnet': string;
  };
  time: {
    hours: string;
    minutes: string;
    shortHours: string;
    shortMinutes: string;
  };
  errors: {
    no_context: string;
  };
}

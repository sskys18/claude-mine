# claude-mine

Custom status line HUD for Claude Code that displays model, context window, rate limits, and git branch.

## Architecture

Two independent entry points sharing the `src/` tree:

1. **Status line** (`src/index.ts`) — Invoked by Claude Code's `statusLine` setting. Reads JSON from stdin, fetches rate limits, prints ANSI-colored lines to stdout. Stateless per invocation; caching is file-based.
2. **Telegram bot** (`src/telegram/index.ts`) — Long-running process (`bun run bot`). Receives Claude Code hook events via HTTP, sends notifications to Telegram, supports "See more" and "Remote Control" actions.

```
src/
  index.ts              # Status line entry point
  types.ts              # Shared interfaces (StdinInput, Config, RenderContext, etc.)
  constants.ts          # Timeouts, autocompact buffer
  render/
    index.ts            # Composes 3 output lines, applies NBSP
    session-line.ts     # Line 1: model + context + 5h limit; Line 2: 7d + Sonnet limits
    project-line.ts     # Line 3: project name + git branch
  utils/
    api-client.ts       # Fetches /api/oauth/usage with file-lock, disk cache, 429 backoff
    credentials.ts      # Reads OAuth token from macOS Keychain or ~/.claude/.credentials.json
    colors.ts           # ANSI 256-color helpers, percent-based coloring (green/gold/red)
    formatters.ts       # Token formatting (K/M), countdown, model name shortening
    git.ts              # Shells out to `git rev-parse` for branch name
    i18n.ts             # Label strings
    errors.ts           # Debug logging (CLAUDE_HUD_DEBUG=1)
  telegram/
    index.ts            # Bot entry point, wires hook server to bot
    bot.ts              # grammY bot: sendAlarm, "See more", "Remote Control" callbacks
    config.ts           # Reads ~/.claude/telegram.env (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
    formatter.ts        # HTML message formatting for Telegram
    transcript.ts       # Parses JSONL transcript for last assistant message + files touched
    session-store.ts    # In-memory session map keyed by alarm message ID
    hook-server.ts      # Bun.serve HTTP server on port 17845, POST /hook
    remote-control.ts   # Activates RC via AppleScript keystroke, scrapes URL from transcript
```

## Build & Run

```bash
bun install
bun run build          # Bundles src/index.ts -> dist/index.js (--target=node)
bun run bot            # Starts Telegram bot
bun run dev            # Starts Telegram bot with --watch
bun run test           # Pipes sample JSON into dist/index.js
```

Build uses `bun build` (single-file bundler), not `tsc`. The `tsconfig.json` exists for IDE type checking only.

## Key Design Decisions

- **File-lock gated API fetch**: `api-client.ts` uses an atomic lock file (`wx` flag) to prevent thundering herd when multiple Claude Code sessions refresh simultaneously. Lock has a 30s staleness check.
- **Disk cache with backoff**: Rate limit data is cached to `~/.claude/claude-mine-cache.json`. On 429 or network errors, a backoff marker is written to suppress retries for the TTL period (default 300s).
- **Credentials**: macOS Keychain is preferred (`security find-generic-password`). Falls back to `~/.claude/.credentials.json`. File permissions are checked (warns if not 0600). Token is nulled after use.
- **No test framework**: Validation is manual via `bun run test` piping JSON to the built output.
- **Telegram bot uses Bun APIs**: `hook-server.ts` and `remote-control.ts` use `Bun.serve` and `Bun.spawn` directly — they won't run on Node.
- **ANSI output**: Spaces are replaced with `\u00A0` (non-breaking space) so Claude Code's status line doesn't collapse them.

## Configuration

- `~/.claude/claude-mine.local.json` — Plan config (`pro`, `max100`, `max200`), cache TTL
- `~/.claude/settings.json` — statusLine command pointing to `dist/index.js`
- `~/.claude/telegram.env` — `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (bot only)

## Conventions

- TypeScript with strict mode, ESM (`"type": "module"`)
- No classes — functions and plain objects throughout
- Errors are silently swallowed in production; debug output via `CLAUDE_HUD_DEBUG=1` to stderr
- Color thresholds: green 0-50%, gold 51-80%, red 81-100%
- All external process calls (git, security keychain) have a 3s timeout (`EXEC_TIMEOUT_MS`)
- API calls have a 5s timeout (`API_TIMEOUT_MS`)

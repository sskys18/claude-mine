# claude-mine

Neon multi-line status line for Claude Code — session, model health, account + Codex usage, and sspower flow stage.

```
Opus 4.8 │ 101K/1.0M 10% │ fast │ 1h16m
.claude git:(main) +37,-30 · sskys18/claude-config · ◆ flow exec 3/6
● claude │ 5h 29% (2h13m) │ 7d 6% (5d18h)
● codex  │ 5h 15% (46m) │ 7d 17% (3d)
```

## Layout

**Line 1 — session**
- model name, context tokens `used/total` + `%` (autocompact-aware: adds the ~45K buffer CC reserves before it compacts)
- `fast` badge when fast mode is on; output-style name when non-default
- **live session timer** (`1h16m`) — real wall-clock since the transcript was created, ticked by `refreshInterval` (see Setup). Minute granularity.

**Line 2 — project**
- basename(cwd), `git:(branch)`, `+ins,-del` working-tree diff, `owner/repo`
- `◆ flow <stage> i/6` — active sspower flow stage for this cwd, read live from `~/.claude/sspower/flow-state.json` (stages: plan, plan-review, exec, test, review, merge). Blank when no flow is active.

**Line 3 — Claude**
- `●` service-health dot (Anthropic Statuspage indicator)
- `5h` / `7d` account rate limits: `used% (time-to-reset)` from CC's `rate_limits` payload

**Line 4 — Codex**
- `●` service-health dot (OpenAI Statuspage indicator)
- `5h` / `7d` Codex usage `used% (time-to-reset)` from the latest `~/.codex` session rollout's `rate_limits` snapshot. Dimmed + marked `stale` when the source snapshot is older than 6h (it only updates when codex runs).

Health dot color: green = operational, gold = minor, red = major/critical, gray = unknown/not-yet-probed.

## How it works

- **Session/context/limits** come from the JSON Claude Code feeds the status line on stdin (`context_window`, `cost`, `rate_limits`, `effort`, `fast_mode`, `workspace.repo`, `transcript_path`). No API calls, no credentials.
- **Service health** (Claude + Codex) and **Codex usage** are gathered by a detached probe (`dist/health-probe.js`) that the status line spawns out-of-band when its cache is stale (120s TTL, shared across all sessions via `$TMPDIR/claude-statusline-health.json`, with a spawn-lock so concurrent sessions fire only one probe). The render only *reads* the cache — it never blocks on the network.
  - Claude: `https://anthropic.statuspage.io/api/v2/status.json`
  - Codex: `https://status.openai.com/api/v2/status.json` (Codex CLI runs on the OpenAI API)
  - Codex usage: newest `~/.codex/sessions/**/rollout-*.jsonl` → last `rate_limits` event
- **sspower flow** is read live from `flow-state.json` every render (tiny local file; reflects stage changes immediately, no cache lag).

## Setup

### 1. Clone & build

```bash
git clone https://github.com/sskys18/claude-mine.git ~/claude-mine
cd ~/claude-mine
bun install && bun run build   # builds dist/index.js + dist/health-probe.js
```

> No bun? `npm install && npx tsc` works, but the build script uses `bun build`; adjust to emit both `dist/index.js` and `dist/health-probe.js`.

### 2. Enable the status line

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/claude-mine/dist/index.js",
    "refreshInterval": 60
  }
}
```

`refreshInterval` (seconds) re-runs the status line on a timer so the session clock and health dots stay current while idle. Use `60` for the minute timer; drop to `1` for a per-second clock. Without it, the line only updates on activity (new message / tool / keystroke). Settings reload on your next interaction — no restart needed.

### 3. Verify

Open or interact with a Claude Code session; the four lines appear below the input. The health dots are gray on the first frame, then populate once the probe writes its cache (~1s).

## Requirements

- Claude Code v2.1.132+ (provides `context_window` + `rate_limits` on stdin)
- Node.js 22+ (probe uses global `fetch`, `node:fs` recursive readdir) or Bun
- Optional: `codex` CLI on PATH for the Codex usage line; sspower for the flow-stage segment

## Colors

| Color | Usage |
|-------|-------|
| Neon green | 0–50% used / operational |
| Electric gold | 51–80% / minor |
| Hot red | 81–100% / major-critical |
| Gray | labels, separators, stale/unknown |

## License

MIT

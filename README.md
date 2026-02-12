# claude-mine

Neon status line for Claude Code.

```
Opus 4.6 │ 95K/200K 48% │ 6%(4h21m)
7d: 5%(5d 4h) │ S: 1%(~~)
working-repo git:(main)
```

## Setup

### Option A: Let Claude do it

Paste this into Claude Code:

> Clone https://github.com/sskys18/claude-mine.git to ~/claude-mine, run bun install && bun run build (or npm if no bun). Ask me which plan I'm on (max200, max100, or pro) then create ~/.claude/claude-mine.local.json with that plan. Read my existing ~/.claude/settings.json and merge in the statusLine config pointing to ~/claude-mine/dist/index.js using whichever runtime is available (bun or node). After everything is set up, delete the cloned source and keep only dist/index.js.

### Option B: Manual

#### 1. Clone & build

```bash
git clone https://github.com/sskys18/claude-mine.git ~/claude-mine
cd ~/claude-mine
bun install && bun run build
```

> No bun? Use `npm install && npx tsc && node dist/index.js` instead.

#### 2. Configure your plan

Create `~/.claude/claude-mine.local.json`:

```json
{
  "plan": "max200"
}
```

| Plan | Rate limits shown |
|------|-------------------|
| `max200` | 5h + 7d + Sonnet |
| `max100` | 5h + 7d + Sonnet |
| `pro` | 5h only |

#### 3. Enable the status line

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun ~/claude-mine/dist/index.js"
  }
}
```

#### 4. Verify

Open a new Claude Code session. The HUD should appear below the input field.

## How it works

Reads Claude Code session data via stdin and fetches rate limits from the Anthropic API using your local credentials (macOS Keychain or `~/.claude/.credentials.json`).

## Colors

| Color | Usage |
|-------|-------|
| Neon green | 0–50% |
| Electric gold | 51–80% |
| Hot red | 81–100% |

## Requirements

- Claude Code v1.0.80+
- Bun or Node.js 18+

## License

MIT

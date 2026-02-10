# claude-mine

Neon status line for Claude Code.

```
Opus 4.6 │ 95K/200K 48% │ 6%(4h21m)
7d: 5%(5d 4h) │ S: 1%(~~)
quantus-app git:(main)
```

## Setup

### 1. Clone & build

```bash
git clone https://github.com/sskys18/claude-mine.git ~/claude-mine
cd ~/claude-mine
bun install && bun run build
```

> No bun? Use `npm install && npx tsc && node dist/index.js` instead.

### 2. Configure your plan

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

### 3. Enable the status line

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun ~/claude-mine/dist/index.js"
  }
}
```

Replace `~/claude-mine` with wherever you cloned it.

### 4. Verify

Open a new Claude Code session. You should see the HUD below the input field.

## How it works

The status line reads your Claude Code session data via stdin and fetches rate limits from the Anthropic API using your local credentials (macOS Keychain or `~/.claude/.credentials.json`).

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

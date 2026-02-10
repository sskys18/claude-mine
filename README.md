# claude-mine

Personal status line for Claude Code.

## Features

- **Model Display**: Current model name (Opus, Sonnet, Haiku)
- **Token Usage**: Current/total tokens with color-coded percentage
- **5h Rate Limit**: Merged into the main line — shows countdown only when clean (≤5%), or percentage + countdown when notable (>5%)
- **7d Rate Limits**: 7-day all + Sonnet usage with day/hour countdown
- **Project Info**: Directory name with git branch
- **Neon Colors**: 256-color vibrant palette

## Output

```
Opus 4.6 │ 95K/200K 48% │ 6%(4h21m)
7d: 5%(5d 4h) │ S: 1%(~~)
quantus-app git:(main)
```

When 5h usage is clean (≤5%):
```
Opus 4.6 │ 95K/200K 48% │ ⏳ 4h36m
```

## Installation

```bash
git clone https://github.com/sskys18/claude-mine.git
cd claude-mine
bun install && bun run build
```

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun /path/to/claude-mine/dist/index.js"
  }
}
```

## Configuration

Create `~/.claude/claude-mine.local.json`:

```json
{
  "plan": "max200",
  "cache": {
    "ttlSeconds": 60
  }
}
```

| Plan | Description |
|------|-------------|
| `max200` | Max $200/month (20x) — 5h + 7d + Sonnet |
| `max100` | Max $100/month (5x) — 5h + 7d + Sonnet |
| `pro` | Pro — 5h only |

## Color Legend

| Color | Usage | Meaning |
|-------|-------|---------|
| Neon green | 0–50% | Safe |
| Electric gold | 51–80% | Warning |
| Hot red | 81–100% | Critical |

## Requirements

- **Claude Code** v1.0.80+
- **Bun** or **Node.js** 18+

## License

MIT

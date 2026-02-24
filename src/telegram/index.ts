import pino from "pino";
import { createBot } from "./bot.ts";
import { startHookServer, type HookPayload } from "./hook-server.ts";
import { type Session } from "./session-store.ts";
import { loadConfig } from "./config.ts";

const log = pino({ name: "claude-telegram" });

function deriveProjectName(cwd: string): string {
  const parts = cwd.split("/");
  const skip = new Set([
    "Users",
    "sskys",
    "blockwavelabs",
    "Mine",
    "Documents",
    "Quant",
    "home",
  ]);

  let meaningful: string[] = [];
  for (const part of parts) {
    if (!part || skip.has(part)) continue;
    meaningful.push(part);
  }

  meaningful = meaningful.filter((p) => p !== "packages");

  if (meaningful.length > 2) {
    meaningful = meaningful.slice(-2);
  }

  return meaningful.join(" / ") || "unknown";
}

async function main() {
  const config = loadConfig();
  log.info("config loaded");

  const { bot, sendAlarm } = createBot();

  startHookServer(17845, (payload: HookPayload) => {
    const session: Session = {
      projectDir: payload.cwd,
      projectName: deriveProjectName(payload.cwd),
      sessionId: payload.session_id,
      transcriptPath: payload.transcript_path.replace(
        /^~/,
        process.env.HOME || "",
      ),
      hookEvent: payload.hook_event_name,
      lastActivity: new Date(),
      alarmMessageId: 0,
      chatId: parseInt(config.TELEGRAM_CHAT_ID),
    };

    sendAlarm(session).catch((err) => {
      log.error({ err }, "failed to send alarm");
    });
  });

  await bot.api.deleteWebhook();
  bot.start({
    onStart: () => log.info("telegram bot started"),
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

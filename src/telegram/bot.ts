import { Bot, InlineKeyboard } from "grammy";
import pino from "pino";
import { loadConfig } from "./config.ts";
import {
  storeSession,
  getSession,
  setActiveSession,
  type Session,
} from "./session-store.ts";
import { formatAlarm, formatExpanded, formatRC } from "./formatter.ts";
import { parseTranscript } from "./transcript.ts";
import { activateRC } from "./remote-control.ts";

const log = pino({ name: "bot" });

const FALLBACK_URL = "https://claude.ai/code";

export function createBot() {
  const config = loadConfig();
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
  const chatId = config.TELEGRAM_CHAT_ID;

  // ── Send alarm ──
  async function sendAlarm(session: Session): Promise<void> {
    const text = formatAlarm(session);
    const keyboard = new InlineKeyboard()
      .text("See more", "see_more")
      .text("Remote Control", "rc");

    const msg = await bot.api.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });

    session.alarmMessageId = msg.message_id;
    session.chatId = parseInt(chatId);
    storeSession(msg.message_id, session);
    setActiveSession(msg.message_id);

    log.info(
      { messageId: msg.message_id, project: session.projectName },
      "alarm sent",
    );
  }

  // ── "See more" callback ──
  bot.callbackQuery("see_more", async (ctx) => {
    const messageId = ctx.callbackQuery.message?.message_id;
    if (!messageId) return ctx.answerCallbackQuery("No message found");

    const session = getSession(messageId);
    if (!session) return ctx.answerCallbackQuery("Session expired");

    const { lastAssistantMessage, filesTouched } = parseTranscript(
      session.transcriptPath,
      session.projectDir,
    );

    const text = formatExpanded(session, lastAssistantMessage, filesTouched);
    await ctx.editMessageText(text, { parse_mode: "HTML" });
    setActiveSession(messageId);
    await ctx.answerCallbackQuery();

    log.info({ messageId, project: session.projectName }, "expanded alarm");
  });

  // ── "Remote Control" callback ──
  bot.callbackQuery("rc", async (ctx) => {
    const messageId = ctx.callbackQuery.message?.message_id;
    if (!messageId) return ctx.answerCallbackQuery("No message found");

    const session = getSession(messageId);
    if (!session) return ctx.answerCallbackQuery("Session expired");

    await ctx.answerCallbackQuery("Activating RC...");
    log.info({ messageId, project: session.projectName }, "RC requested");

    const url = await activateRC(session.transcriptPath);
    const rcUrl = url || FALLBACK_URL;

    const text = formatRC(session, rcUrl);
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });

    log.info({ messageId, url: rcUrl }, "RC message sent");
  });

  bot.catch((err) => {
    log.error({ err: err.error }, "bot error");
  });

  return { bot, sendAlarm };
}

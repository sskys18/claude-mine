import { Bot, InlineKeyboard } from "grammy";
import pino from "pino";
import { loadConfig } from "./config.ts";
import {
  storeSession,
  getSession,
  setActiveSession,
  getAlarmIdForMessage,
  mapResponseToAlarm,
  type Session,
} from "./session-store.ts";
import { formatAlarm, formatExpanded } from "./formatter.ts";
import { parseTranscript } from "./transcript.ts";
import { spawnClaude } from "./claude-process.ts";

const log = pino({ name: "bot" });

const EDIT_INTERVAL_MS = 1500;
const MAX_MSG_LEN = 4000;

export function createBot() {
  const config = loadConfig();
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
  const chatId = config.TELEGRAM_CHAT_ID;

  // ── Send alarm ──
  async function sendAlarm(session: Session): Promise<void> {
    const text = formatAlarm(session);
    const keyboard = new InlineKeyboard().text("See more", "see_more");

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

  // ── User replies → Claude ──
  bot.on("message:text", async (ctx) => {
    if (String(ctx.chat.id) !== chatId) return;

    // Only respond to replies to bot messages (alarm or previous responses)
    const replyToId = ctx.message.reply_to_message?.message_id;
    if (!replyToId) return; // ignore non-reply messages

    const alarmId = getAlarmIdForMessage(replyToId);
    if (!alarmId) return; // not a reply to a tracked message

    const session = getSession(alarmId);
    if (!session) return; // session expired

    const userMessage = ctx.message.text;
    log.info(
      { project: session.projectName, replyTo: replyToId, alarmId },
      "user reply received",
    );

    const claude = spawnClaude(
      session.sessionId,
      session.projectDir,
      userMessage,
    );

    let fullText = "";
    let sentMessageId: number | null = null;
    let lastEditText = "";
    let lastEditTime = 0;
    let editTimer: ReturnType<typeof setTimeout> | null = null;
    let completed = false;

    const editMessage = async () => {
      if (!sentMessageId || !fullText || fullText === lastEditText) return;
      try {
        const display =
          fullText.length > MAX_MSG_LEN
            ? fullText.slice(0, MAX_MSG_LEN) + "..."
            : fullText;
        await ctx.api.editMessageText(ctx.chat.id, sentMessageId, display);
        lastEditText = fullText;
        lastEditTime = Date.now();
      } catch {
        // rate limited or text unchanged
      }
    };

    const scheduleEdit = () => {
      if (editTimer || completed) return;
      const elapsed = Date.now() - lastEditTime;
      const delay = Math.max(0, EDIT_INTERVAL_MS - elapsed);
      editTimer = setTimeout(async () => {
        editTimer = null;
        await editMessage();
        if (!completed) scheduleEdit();
      }, delay);
    };

    try {
      const sent = await ctx.reply("...");
      sentMessageId = sent.message_id;
      // Track this response so replies to it route to the same session
      mapResponseToAlarm(sent.message_id, alarmId);

      for await (const delta of claude.output()) {
        fullText += delta;
        if (fullText.length - lastEditText.length >= 20) {
          scheduleEdit();
        }
      }

      completed = true;
      if (editTimer) {
        clearTimeout(editTimer);
        editTimer = null;
      }

      if (sentMessageId && fullText) {
        if (fullText !== lastEditText) {
          if (fullText.length > MAX_MSG_LEN) {
            await ctx.api.editMessageText(
              ctx.chat.id,
              sentMessageId,
              fullText.slice(0, MAX_MSG_LEN),
            );
            let remaining = fullText.slice(MAX_MSG_LEN);
            while (remaining.length > 0) {
              const overflow = await ctx.reply(remaining.slice(0, MAX_MSG_LEN));
              mapResponseToAlarm(overflow.message_id, alarmId);
              remaining = remaining.slice(MAX_MSG_LEN);
            }
          } else {
            await ctx.api.editMessageText(
              ctx.chat.id,
              sentMessageId,
              fullText,
            );
          }
        }
      } else if (sentMessageId && !fullText) {
        // Wait for process exit to capture stderr
        await claude.done;
        const errMsg = claude.errorText
          ? `Error from claude:\n${claude.errorText}`
          : "No response generated.";
        await ctx.api.editMessageText(
          ctx.chat.id,
          sentMessageId,
          errMsg.slice(0, MAX_MSG_LEN),
        );
      }
    } catch (err) {
      log.error({ err }, "streaming response failed");
      if (sentMessageId) {
        try {
          await ctx.api.editMessageText(
            ctx.chat.id,
            sentMessageId,
            "Error: something went wrong.",
          );
        } catch {}
      }
    } finally {
      if (editTimer) clearTimeout(editTimer);
    }
  });

  bot.catch((err) => {
    log.error({ err: err.error }, "bot error");
  });

  return { bot, sendAlarm };
}

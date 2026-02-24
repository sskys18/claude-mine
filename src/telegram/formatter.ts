import type { Session } from "./session-store.ts";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatAlarm(session: Session): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const time = `${mm}.${dd} ${hh}:${mi}`;

  const icon = session.hookEvent === "Stop" ? "\u23f9" : "\u26a1";

  return [
    `<b>${icon} ${esc(session.hookEvent)}</b>`,
    `<code>${esc(session.projectName)}</code>`,
    time,
  ].join("\n");
}

export function formatExpanded(
  session: Session,
  lastMessage: string,
  filesTouched: string[],
): string {
  const alarm = formatAlarm(session);
  const parts = [alarm, ""];

  if (lastMessage) {
    const truncated =
      lastMessage.length > 1500
        ? lastMessage.slice(0, 1500) + "..."
        : lastMessage;
    parts.push("<b>Last message:</b>");
    parts.push(esc(truncated));
    parts.push("");
  }

  if (filesTouched.length > 0) {
    const fileList = filesTouched
      .slice(0, 20)
      .map((f) => esc(f))
      .join(", ");
    parts.push(`<b>Files:</b> ${fileList}`);
    parts.push("");
  }

  parts.push("<i>Reply below to continue \u2193</i>");
  return parts.join("\n");
}

import { readFileSync } from "node:fs";
import pino from "pino";

const log = pino({ name: "remote-control" });

const RC_WAIT_MS = 6000;
const URL_PATTERN = /https:\/\/claude\.ai\/code\/session_\S+/;

function countLines(filePath: string): number {
  try {
    const content = readFileSync(filePath, "utf-8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

function readNewLines(filePath: string, afterLine: number): string[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    return lines.slice(afterLine);
  } catch {
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function activateRC(
  transcriptPath: string,
): Promise<string | null> {
  const linesBefore = countLines(transcriptPath);
  log.info({ transcriptPath, linesBefore }, "activating RC via AppleScript");

  const script = `
    tell application "Warp" to activate
    delay 0.5
    tell application "System Events"
      keystroke "/rc"
      delay 0.2
      key code 36
    end tell
  `;

  const proc = Bun.spawn(["osascript", "-e", script], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;

  if (proc.exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    log.error({ exitCode: proc.exitCode, stderr }, "AppleScript failed");
    return null;
  }

  log.info("AppleScript executed, waiting for RC to connect...");
  await sleep(RC_WAIT_MS);

  const newLines = readNewLines(transcriptPath, linesBefore);
  for (const line of newLines) {
    const match = line.match(URL_PATTERN);
    if (match) {
      log.info({ url: match[0] }, "found RC URL in transcript");
      return match[0];
    }
  }

  log.warn("RC URL not found in transcript, returning fallback");
  return null;
}

import pino from "pino";

const log = pino({ name: "claude-proc" });

export interface ClaudeProcess {
  output(): AsyncGenerator<string, void, unknown>;
  kill(): void;
  done: Promise<void>;
  /** Non-empty if the process exited with an error */
  errorText: string;
}

let current: { proc: ReturnType<typeof Bun.spawn>; killed: boolean } | null =
  null;

export function killCurrent(): void {
  if (current && !current.killed) {
    current.killed = true;
    try {
      current.proc.kill();
    } catch {}
    current = null;
  }
}

export function spawnClaude(
  sessionId: string,
  cwd: string,
  message: string,
): ClaudeProcess {
  killCurrent();

  const env = { ...process.env };
  delete env.CLAUDE_SESSION_ID;
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;

  const proc = Bun.spawn(
    [
      "/opt/homebrew/bin/claude",
      "--print",
      "--output-format",
      "stream-json",
      "--include-partial-messages",
      "--resume",
      sessionId,
      "--dangerously-skip-permissions",
      message,
    ],
    { cwd, stdout: "pipe", stderr: "pipe", env },
  );

  const state = { proc, killed: false };
  current = state;
  log.info({ sessionId, cwd }, "spawned claude process");

  let stderrText = "";

  // Drain stderr in the background
  (async () => {
    try {
      const reader = proc.stderr.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        stderrText += decoder.decode(value, { stream: true });
      }
      reader.releaseLock();
    } catch {}
  })();

  const donePromise = proc.exited.then(() => {
    if (current === state) current = null;
    if (proc.exitCode !== 0) {
      log.error(
        { exitCode: proc.exitCode, stderr: stderrText },
        "claude process exited with error",
      );
      result.errorText =
        stderrText.trim() || `claude exited with code ${proc.exitCode}`;
    } else {
      log.info({ exitCode: proc.exitCode }, "claude process exited");
    }
  });

  const result: ClaudeProcess = {
    errorText: "",
    async *output(): AsyncGenerator<string, void, unknown> {
      const reader = proc.stdout.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastText = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              if (event.type === "assistant" && event.message?.content) {
                const fullText = event.message.content
                  .filter((c: any) => c.type === "text")
                  .map((c: any) => c.text)
                  .join("");
                if (fullText.length > lastText.length) {
                  yield fullText.slice(lastText.length);
                  lastText = fullText;
                }
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    kill() {
      if (!state.killed) {
        state.killed = true;
        try {
          proc.kill();
        } catch {}
        if (current === state) current = null;
      }
    },

    done: donePromise,
  };

  return result;
}

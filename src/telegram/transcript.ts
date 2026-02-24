import { readFileSync } from "node:fs";

export interface TranscriptSummary {
  lastAssistantMessage: string;
  filesTouched: string[];
}

export function parseTranscript(
  transcriptPath: string,
  projectDir: string,
): TranscriptSummary {
  let lastAssistantMessage = "";
  const filesSet = new Set<string>();

  try {
    const content = readFileSync(transcriptPath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        if (entry.type === "assistant" && entry.message?.content) {
          const textParts = entry.message.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("");
          if (textParts) lastAssistantMessage = textParts;

          for (const block of entry.message.content) {
            if (
              block.type === "tool_use" &&
              ["Read", "Edit", "Write"].includes(block.name) &&
              block.input?.file_path
            ) {
              let fp: string = block.input.file_path;
              if (fp.startsWith(projectDir + "/")) {
                fp = fp.slice(projectDir.length + 1);
              }
              filesSet.add(fp);
            }
          }
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // file not found or unreadable
  }

  return {
    lastAssistantMessage,
    filesTouched: [...filesSet],
  };
}

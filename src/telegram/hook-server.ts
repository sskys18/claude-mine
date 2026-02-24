import pino from "pino";

const log = pino({ name: "hook-server" });

export interface HookPayload {
  hook_event_name: string;
  session_id: string;
  cwd: string;
  transcript_path: string;
}

type OnHook = (payload: HookPayload) => void;

export function startHookServer(port: number, onHook: OnHook): void {
  Bun.serve({
    port,
    hostname: "127.0.0.1",
    fetch: async (req) => {
      const url = new URL(req.url);

      if (req.method === "POST" && url.pathname === "/hook") {
        try {
          const payload = (await req.json()) as HookPayload;
          if (!payload.session_id || !payload.cwd) {
            return new Response("invalid payload", { status: 400 });
          }
          log.info(
            { event: payload.hook_event_name, cwd: payload.cwd },
            "hook received",
          );
          onHook(payload);
          return new Response("ok");
        } catch (err) {
          log.error({ err }, "hook parse error");
          return new Response("bad request", { status: 400 });
        }
      }

      if (req.method === "GET" && url.pathname === "/health") {
        return new Response("ok");
      }

      return new Response("not found", { status: 404 });
    },
  });

  log.info({ port }, "hook server listening");
}

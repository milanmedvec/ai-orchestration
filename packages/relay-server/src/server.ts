import { createHandlers } from "./handlers.ts";
import type { PeerSocketData } from "./state.ts";
import type { Context } from "./context.ts";

export function startServer(context: Context): void {
  const { config, logger, state } = context;
  const { onOpen, onMessage, onClose } = createHandlers(context);

  const server = Bun.serve<PeerSocketData>({
    port: config.PORT,
    fetch(req, server) {
      const { pathname } = new URL(req.url);

      if (pathname === "/ws") {
        const data: PeerSocketData = { connectedAt: Date.now(), id: null };
        const upgraded = server.upgrade(req, { data });
        if (upgraded) return undefined;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      if (pathname === "/health") {
        return new Response(
          JSON.stringify({ status: "ok", peers: state.peers.size }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Not found", { status: 404 });
    },
    websocket: {
      open: onOpen,
      message: onMessage,
      close: onClose,
      idleTimeout: 120,
    },
  });

  logger.info("relay listening", { url: `ws://localhost:${server.port}/ws` });
}

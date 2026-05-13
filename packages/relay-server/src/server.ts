import { onOpen, onMessage, onClose } from "./handlers.ts";
import { peers } from "./state.ts";
import type { PeerSocketData } from "./state.ts";

const PORT = Number(process.env["PORT"] ?? 3000);

const server = Bun.serve<PeerSocketData>({
  port: PORT,
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
        JSON.stringify({ status: "ok", peers: peers.size }),
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

console.log(`[relay] listening on ws://localhost:${server.port}/ws`);

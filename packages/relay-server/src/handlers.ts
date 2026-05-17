import type { ServerWebSocket } from "bun";
import type { PeerSocketData } from "./state.ts";
import type { Context } from "./context.ts";
import {
  InboundMsgSchema,
  serialize,
  deserialize,
  type RegisterMsg,
  type CommandRequestMsg,
  type CommandAckMsg,
  type CommandProgressMsg,
  type CommandResultMsg,
  type CommandErrorMsg,
  type ClientBoundMsg,
  type OrchestratorBoundMsg,
} from "@ai-orchestration/lib";

type WS = ServerWebSocket<PeerSocketData>;

export function createHandlers(context: Context) {
  const { logger, state } = context;

  function send(ws: WS, msg: ClientBoundMsg | OrchestratorBoundMsg): void {
    ws.send(serialize(msg));
  }

  function sendError(ws: WS, code: string, message: string): void {
    send(ws, { type: "error", code, message });
  }

  function onOpen(ws: WS): void {
    logger.debug("connection opened", { remoteAddress: ws.remoteAddress });
  }

  function onMessage(ws: WS, raw: string | ArrayBuffer | Uint8Array): void {
    const result = deserialize(raw, InboundMsgSchema);
    if (!result.ok) {
      sendError(ws, "INVALID_MESSAGE", result.error);
      return;
    }

    const msg = result.data;
    switch (msg.type) {
      case "register":          return handleRegister(ws, msg);
      case "command_request":   return handleCommandRequest(ws, msg);
      case "command_ack":       return handleRelay(ws, msg);
      case "command_progress":  return handleRelay(ws, msg);
      case "command_result":    return handleRelay(ws, msg);
      case "command_error":     return handleRelay(ws, msg);
    }
  }

  function onClose(ws: WS, code: number, _reason: string): void {
    const { id } = ws.data;
    if (!id) return;

    const peer = state.get(id);
    if (!peer) return;

    state.remove(id);
    logger.info("peer disconnected", { role: peer.role, id, code });

    if (peer.role === "orchestrator") {
      for (const client of state.clients()) {
        send(client.ws, { type: "orchestrator_left", id });
      }
    }
  }

  function handleRegister(ws: WS, msg: RegisterMsg): void {
    const requiredToken = context.config.AUTH_TOKEN;
    if (requiredToken && msg.token !== requiredToken) {
      sendError(ws, "UNAUTHORIZED", "Invalid or missing token");
      ws.close();
      return;
    }

    if (state.get(msg.id)) {
      sendError(ws, "DUPLICATE_ID", `ID ${msg.id} is already registered`);
      return;
    }

    ws.data.id = msg.id;
    state.add({ id: msg.id, role: msg.role, meta: msg.meta, ws });
    logger.info("peer registered", { role: msg.role, id: msg.id });

    if (msg.role === "orchestrator") {
      for (const client of state.clients()) {
        send(client.ws, { type: "orchestrator_joined", id: msg.id, meta: msg.meta });
      }
    } else {
      send(ws, {
        type: "orchestrator_list",
        orchestrators: state.orchestrators().map((o) => ({ id: o.id, meta: o.meta })),
      });
    }
  }

  function handleCommandRequest(ws: WS, msg: CommandRequestMsg): void {
    if (!ws.data.id) {
      sendError(ws, "NOT_REGISTERED", "Must register before sending commands");
      return;
    }

    const orchestrator = state.get(msg.targetOrchestratorId);
    if (!orchestrator || orchestrator.role !== "orchestrator") {
      sendError(ws, "ORCHESTRATOR_NOT_FOUND", `No orchestrator with id ${msg.targetOrchestratorId}`);
      return;
    }

    send(orchestrator.ws, {
      type: "command_dispatch",
      requestId: msg.requestId,
      clientId: ws.data.id,
      command: msg.command,
      input: msg.input,
    });
  }

  function handleRelay(
    ws: WS,
    msg: CommandAckMsg | CommandProgressMsg | CommandResultMsg | CommandErrorMsg,
  ): void {
    if (!ws.data.id) {
      sendError(ws, "NOT_REGISTERED", "Must register first");
      return;
    }
    for (const client of state.clients()) {
      send(client.ws, msg);
    }
  }

  return { onOpen, onMessage, onClose };
}

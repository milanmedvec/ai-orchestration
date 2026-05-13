import type { ServerWebSocket } from "bun";
import {
  addPeer,
  removePeer,
  getPeer,
  getOrchestrators,
  getClients,
  type PeerSocketData,
} from "./state.ts";
import {
  InboundMsgSchema,
  serialize,
  deserialize,
  type RegisterMsg,
  type TaskRequestMsg,
  type TaskAckMsg,
  type TaskProgressMsg,
  type TaskResultMsg,
  type TaskErrorMsg,
  type ClientBoundMsg,
  type OrchestratorBoundMsg,
} from "@ai-orchestration/lib";

type WS = ServerWebSocket<PeerSocketData>;

function send(ws: WS, msg: ClientBoundMsg | OrchestratorBoundMsg): void {
  ws.send(serialize(msg));
}

function sendError(ws: WS, code: string, message: string): void {
  send(ws, { type: "error", code, message });
}

export function onOpen(ws: WS): void {
  console.log(`[relay] connection opened from ${ws.remoteAddress}`);
}

export function onMessage(ws: WS, raw: string | ArrayBuffer | Uint8Array): void {
  const result = deserialize(raw, InboundMsgSchema);
  if (!result.ok) {
    sendError(ws, "INVALID_MESSAGE", result.error);
    return;
  }

  const msg = result.data;
  switch (msg.type) {
    case "register":      return handleRegister(ws, msg);
    case "task_request":  return handleTaskRequest(ws, msg);
    case "task_ack":      return handleRelay(ws, msg);
    case "task_progress": return handleRelay(ws, msg);
    case "task_result":   return handleRelay(ws, msg);
    case "task_error":    return handleRelay(ws, msg);
  }
}

export function onClose(ws: WS, code: number, _reason: string): void {
  const { id } = ws.data;
  if (!id) return;

  const peer = getPeer(id);
  if (!peer) return;

  removePeer(id);
  console.log(`[relay] ${peer.role} ${id} disconnected (${code})`);

  if (peer.role === "orchestrator") {
    for (const client of getClients()) {
      send(client.ws, { type: "orchestrator_left", id });
    }
  }
}

function handleRegister(ws: WS, msg: RegisterMsg): void {
  if (getPeer(msg.id)) {
    sendError(ws, "DUPLICATE_ID", `ID ${msg.id} is already registered`);
    return;
  }

  ws.data.id = msg.id;
  addPeer({ id: msg.id, role: msg.role, meta: msg.meta, ws });
  console.log(`[relay] registered ${msg.role} id=${msg.id}`);

  if (msg.role === "orchestrator") {
    for (const client of getClients()) {
      send(client.ws, { type: "orchestrator_joined", id: msg.id, meta: msg.meta });
    }
  } else {
    send(ws, {
      type: "orchestrator_list",
      orchestrators: getOrchestrators().map((o) => ({ id: o.id, meta: o.meta })),
    });
  }
}

function handleTaskRequest(ws: WS, msg: TaskRequestMsg): void {
  if (!ws.data.id) {
    sendError(ws, "NOT_REGISTERED", "Must register before sending tasks");
    return;
  }

  const orchestrator = getPeer(msg.targetOrchestratorId);
  if (!orchestrator || orchestrator.role !== "orchestrator") {
    sendError(ws, "ORCHESTRATOR_NOT_FOUND", `No orchestrator with id ${msg.targetOrchestratorId}`);
    return;
  }

  send(orchestrator.ws, {
    type: "task_dispatch",
    requestId: msg.requestId,
    clientId: ws.data.id,
    payload: msg.payload,
  });
}

// Relay task lifecycle messages from orchestrator to all clients.
// Clients correlate responses to their requests via requestId.
function handleRelay(ws: WS, msg: TaskAckMsg | TaskProgressMsg | TaskResultMsg | TaskErrorMsg): void {
  if (!ws.data.id) {
    sendError(ws, "NOT_REGISTERED", "Must register first");
    return;
  }
  for (const client of getClients()) {
    send(client.ws, msg);
  }
}

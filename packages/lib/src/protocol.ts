export type Role = "client" | "orchestrator";

export interface PeerMeta {
  name?: string;
  capabilities?: string[];
  [key: string]: unknown;
}

// ── Inbound: peer → server ────────────────────────────────────────────────────

export interface RegisterMsg {
  type: "register";
  id: string;
  role: Role;
  meta?: PeerMeta;
}

export interface TaskRequestMsg {
  type: "task_request";
  requestId: string;
  targetOrchestratorId: string;
  payload: unknown;
}

export interface TaskAckMsg {
  type: "task_ack";
  requestId: string;
  orchestratorId: string;
}

export interface TaskProgressMsg {
  type: "task_progress";
  requestId: string;
  progress: number; // 0–100
  message?: string;
}

export interface TaskResultMsg {
  type: "task_result";
  requestId: string;
  result: unknown;
}

export interface TaskErrorMsg {
  type: "task_error";
  requestId: string;
  code: string;
  message: string;
}

export type InboundMsg =
  | RegisterMsg
  | TaskRequestMsg
  | TaskAckMsg
  | TaskProgressMsg
  | TaskResultMsg
  | TaskErrorMsg;

// ── Outbound: server → client ─────────────────────────────────────────────────

export interface OrchestratorListMsg {
  type: "orchestrator_list";
  orchestrators: Array<{ id: string; meta?: PeerMeta }>;
}

export interface OrchestratorJoinedMsg {
  type: "orchestrator_joined";
  id: string;
  meta?: PeerMeta;
}

export interface OrchestratorLeftMsg {
  type: "orchestrator_left";
  id: string;
}

export interface ErrorMsg {
  type: "error";
  code: string;
  message: string;
}

export type ClientBoundMsg =
  | OrchestratorListMsg
  | OrchestratorJoinedMsg
  | OrchestratorLeftMsg
  | TaskAckMsg
  | TaskProgressMsg
  | TaskResultMsg
  | TaskErrorMsg
  | ErrorMsg;

// ── Outbound: server → orchestrator ──────────────────────────────────────────

export interface TaskDispatchMsg {
  type: "task_dispatch";
  requestId: string;
  clientId: string;
  payload: unknown;
}

export type OrchestratorBoundMsg = TaskDispatchMsg | ErrorMsg;

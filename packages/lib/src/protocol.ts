import { z, type ZodType } from "zod";

export function serialize<T>(msg: T): string {
  return JSON.stringify(msg);
}

export function deserialize<T>(
  raw: string | ArrayBuffer | Uint8Array,
  schema: ZodType<T>,
): { ok: true; data: T } | { ok: false; error: string } {
  let json: unknown;
  try {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  const result = schema.safeParse(json);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, error: result.error.errors[0]?.message ?? "Invalid message" };
}

export const RoleSchema = z.enum(["client", "orchestrator"]);

export const PeerMetaSchema = z.object({
  name: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
}).passthrough();

// ── Inbound: peer → server ────────────────────────────────────────────────────

export const RegisterMsgSchema = z.object({
  type: z.literal("register"),
  id: z.string(),
  role: RoleSchema,
  meta: PeerMetaSchema.optional(),
});

export const TaskRequestMsgSchema = z.object({
  type: z.literal("task_request"),
  requestId: z.string(),
  targetOrchestratorId: z.string(),
  payload: z.unknown(),
});

export const TaskAckMsgSchema = z.object({
  type: z.literal("task_ack"),
  requestId: z.string(),
  orchestratorId: z.string(),
});

export const TaskProgressMsgSchema = z.object({
  type: z.literal("task_progress"),
  requestId: z.string(),
  progress: z.number().min(0).max(100),
  message: z.string().optional(),
});

export const TaskResultMsgSchema = z.object({
  type: z.literal("task_result"),
  requestId: z.string(),
  result: z.unknown(),
});

export const TaskErrorMsgSchema = z.object({
  type: z.literal("task_error"),
  requestId: z.string(),
  code: z.string(),
  message: z.string(),
});

export const InboundMsgSchema = z.discriminatedUnion("type", [
  RegisterMsgSchema,
  TaskRequestMsgSchema,
  TaskAckMsgSchema,
  TaskProgressMsgSchema,
  TaskResultMsgSchema,
  TaskErrorMsgSchema,
]);

// ── Outbound: server → client ─────────────────────────────────────────────────

export const OrchestratorInfoSchema = z.object({
  id: z.string(),
  meta: PeerMetaSchema.optional(),
});

export const OrchestratorListMsgSchema = z.object({
  type: z.literal("orchestrator_list"),
  orchestrators: z.array(OrchestratorInfoSchema),
});

export const OrchestratorJoinedMsgSchema = z.object({
  type: z.literal("orchestrator_joined"),
  id: z.string(),
  meta: PeerMetaSchema.optional(),
});

export const OrchestratorLeftMsgSchema = z.object({
  type: z.literal("orchestrator_left"),
  id: z.string(),
});

export const ErrorMsgSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
  message: z.string(),
});

export const ClientBoundMsgSchema = z.discriminatedUnion("type", [
  OrchestratorListMsgSchema,
  OrchestratorJoinedMsgSchema,
  OrchestratorLeftMsgSchema,
  TaskAckMsgSchema,
  TaskProgressMsgSchema,
  TaskResultMsgSchema,
  TaskErrorMsgSchema,
  ErrorMsgSchema,
]);

// ── Outbound: server → orchestrator ──────────────────────────────────────────

export const TaskDispatchMsgSchema = z.object({
  type: z.literal("task_dispatch"),
  requestId: z.string(),
  clientId: z.string(),
  payload: z.unknown(),
});

export const OrchestratorBoundMsgSchema = z.discriminatedUnion("type", [
  TaskDispatchMsgSchema,
  ErrorMsgSchema,
]);

// ── Inferred types ────────────────────────────────────────────────────────────

export type Role = z.infer<typeof RoleSchema>;
export type PeerMeta = z.infer<typeof PeerMetaSchema>;
export type RegisterMsg = z.infer<typeof RegisterMsgSchema>;
export type TaskRequestMsg = z.infer<typeof TaskRequestMsgSchema>;
export type TaskAckMsg = z.infer<typeof TaskAckMsgSchema>;
export type TaskProgressMsg = z.infer<typeof TaskProgressMsgSchema>;
export type TaskResultMsg = z.infer<typeof TaskResultMsgSchema>;
export type TaskErrorMsg = z.infer<typeof TaskErrorMsgSchema>;
export type InboundMsg = z.infer<typeof InboundMsgSchema>;
export type OrchestratorListMsg = z.infer<typeof OrchestratorListMsgSchema>;
export type OrchestratorJoinedMsg = z.infer<typeof OrchestratorJoinedMsgSchema>;
export type OrchestratorLeftMsg = z.infer<typeof OrchestratorLeftMsgSchema>;
export type ErrorMsg = z.infer<typeof ErrorMsgSchema>;
export type ClientBoundMsg = z.infer<typeof ClientBoundMsgSchema>;
export type TaskDispatchMsg = z.infer<typeof TaskDispatchMsgSchema>;
export type OrchestratorBoundMsg = z.infer<typeof OrchestratorBoundMsgSchema>;

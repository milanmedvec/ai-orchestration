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

// ── Domain schemas ────────────────────────────────────────────────────────────

export const RoleSchema = z.enum(["client", "orchestrator"]);

export const PeerMetaSchema = z.object({
  name: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
}).passthrough();

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  repoUrl: z.string().optional(),
});

export const SessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectId: z.string(),
  status: z.enum(["active", "idle", "terminated"]),
});

// ── Command registry ──────────────────────────────────────────────────────────

export const CommandDefs = {
  list_projects: {
    input: z.object({}),
    output: z.object({ projects: z.array(ProjectSchema) }),
  },
  create_project: {
    input: z.object({ name: z.string(), repoUrl: z.string().optional() }),
    output: ProjectSchema,
  },
  list_sessions: {
    input: z.object({ projectId: z.string() }),
    output: z.object({ sessions: z.array(SessionSchema) }),
  },
  create_session: {
    input: z.object({ projectId: z.string(), name: z.string() }),
    output: SessionSchema,
  },
  terminate_session: {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ success: z.boolean(), sessionId: z.string() }),
  },
} as const;

export const CommandNameSchema = z.enum([
  "list_projects",
  "create_project",
  "list_sessions",
  "create_session",
  "terminate_session",
]);

export type CommandName = z.infer<typeof CommandNameSchema>;
export type CommandInput<K extends CommandName> = z.infer<typeof CommandDefs[K]["input"]>;
export type CommandOutput<K extends CommandName> = z.infer<typeof CommandDefs[K]["output"]>;

// ── Inbound: peer → server ────────────────────────────────────────────────────

export const RegisterMsgSchema = z.object({
  type: z.literal("register"),
  id: z.string(),
  role: RoleSchema,
  meta: PeerMetaSchema.optional(),
});

export const CommandRequestMsgSchema = z.object({
  type: z.literal("command_request"),
  requestId: z.string(),
  targetOrchestratorId: z.string(),
  command: CommandNameSchema,
  input: z.unknown(),
});

export const CommandAckMsgSchema = z.object({
  type: z.literal("command_ack"),
  requestId: z.string(),
  orchestratorId: z.string(),
});

export const CommandProgressMsgSchema = z.object({
  type: z.literal("command_progress"),
  requestId: z.string(),
  progress: z.number().min(0).max(100),
  message: z.string().optional(),
});

export const CommandResultMsgSchema = z.object({
  type: z.literal("command_result"),
  requestId: z.string(),
  command: CommandNameSchema,
  output: z.unknown(),
});

export const CommandErrorMsgSchema = z.object({
  type: z.literal("command_error"),
  requestId: z.string(),
  code: z.string(),
  message: z.string(),
});

export const InboundMsgSchema = z.discriminatedUnion("type", [
  RegisterMsgSchema,
  CommandRequestMsgSchema,
  CommandAckMsgSchema,
  CommandProgressMsgSchema,
  CommandResultMsgSchema,
  CommandErrorMsgSchema,
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
  CommandAckMsgSchema,
  CommandProgressMsgSchema,
  CommandResultMsgSchema,
  CommandErrorMsgSchema,
  ErrorMsgSchema,
]);

// ── Outbound: server → orchestrator ──────────────────────────────────────────

export const CommandDispatchMsgSchema = z.object({
  type: z.literal("command_dispatch"),
  requestId: z.string(),
  clientId: z.string(),
  command: CommandNameSchema,
  input: z.unknown(),
});

export const OrchestratorBoundMsgSchema = z.discriminatedUnion("type", [
  CommandDispatchMsgSchema,
  ErrorMsgSchema,
]);

// ── Inferred types ────────────────────────────────────────────────────────────

export type Role = z.infer<typeof RoleSchema>;
export type PeerMeta = z.infer<typeof PeerMetaSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type RegisterMsg = z.infer<typeof RegisterMsgSchema>;
export type CommandRequestMsg = z.infer<typeof CommandRequestMsgSchema>;
export type CommandAckMsg = z.infer<typeof CommandAckMsgSchema>;
export type CommandProgressMsg = z.infer<typeof CommandProgressMsgSchema>;
export type CommandResultMsg = z.infer<typeof CommandResultMsgSchema>;
export type CommandErrorMsg = z.infer<typeof CommandErrorMsgSchema>;
export type InboundMsg = z.infer<typeof InboundMsgSchema>;
export type OrchestratorListMsg = z.infer<typeof OrchestratorListMsgSchema>;
export type OrchestratorJoinedMsg = z.infer<typeof OrchestratorJoinedMsgSchema>;
export type OrchestratorLeftMsg = z.infer<typeof OrchestratorLeftMsgSchema>;
export type ErrorMsg = z.infer<typeof ErrorMsgSchema>;
export type ClientBoundMsg = z.infer<typeof ClientBoundMsgSchema>;
export type CommandDispatchMsg = z.infer<typeof CommandDispatchMsgSchema>;
export type OrchestratorBoundMsg = z.infer<typeof OrchestratorBoundMsgSchema>;

import {
  CommandDefs,
  OrchestratorBoundMsgSchema,
  serialize,
  deserialize,
  type CommandName,
  type RegisterMsg,
  type CommandAckMsg,
  type CommandResultMsg,
  type CommandErrorMsg,
} from "@ai-orchestration/lib";
import type { Context } from "./context.ts";
import type { Executor } from "./executor.ts";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export function startOrchestrator(context: Context, executor: Executor): void {
  const { logger, config } = context;
  const orchestratorId = crypto.randomUUID();
  let attempt = 0;

  function connect(): void {
    const ws = new WebSocket(config.RELAY_URL);
    let pingInterval: ReturnType<typeof setInterval> | null = null;

    ws.addEventListener("open", () => {
      attempt = 0;

      const msg: RegisterMsg = {
        type: "register",
        id: orchestratorId,
        role: "orchestrator",
        meta: { name: config.ORCHESTRATOR_NAME, capabilities: executor.supportedCommands() },
        token: config.AUTH_TOKEN,
      };

      ws.send(serialize(msg));

      pingInterval = setInterval(() => ws.ping(), 60_000);

      logger.info("registered", { id: orchestratorId, commands: executor.supportedCommands() });
    });

    ws.addEventListener("message", (event) => {
      const result = deserialize(event.data as string, OrchestratorBoundMsgSchema);
      if (!result.ok) {
        logger.error("invalid message", { error: result.error });
        return;
      }

      const msg = result.data;

      if (msg.type === "command_dispatch") {
        const { requestId, command, input } = msg;

        const ack: CommandAckMsg = { type: "command_ack", requestId, orchestratorId };
        ws.send(serialize(ack));

        const inputSchema = CommandDefs[command as CommandName]?.input;
        if (!inputSchema) {
          const err: CommandErrorMsg = { type: "command_error", requestId, code: "UNKNOWN_COMMAND", message: `Unknown command: ${command}` };
          ws.send(serialize(err));
          return;
        }

        const inputResult = inputSchema.safeParse(input);
        if (!inputResult.success) {
          const err: CommandErrorMsg = { type: "command_error", requestId, code: "INVALID_INPUT", message: inputResult.error.errors[0]?.message ?? "Invalid input" };
          ws.send(serialize(err));
          return;
        }

        executor.run(command, inputResult.data as Record<string, unknown>)
          .then((rawOutput) => {
            const outputSchema = CommandDefs[command as CommandName]!.output;
            const outputResult = outputSchema.safeParse(rawOutput);
            if (!outputResult.success) {
              const err: CommandErrorMsg = { type: "command_error", requestId, code: "INVALID_OUTPUT", message: outputResult.error.errors[0]?.message ?? "Invalid output" };
              ws.send(serialize(err));
              return;
            }

            const res: CommandResultMsg = { type: "command_result", requestId, command: command as CommandName, output: outputResult.data };
            ws.send(serialize(res));

            logger.info("command completed", { command, requestId });
          })
          .catch((err: unknown) => {
            const errMsg: CommandErrorMsg = { type: "command_error", requestId, code: "EXEC_ERROR", message: String(err instanceof Error ? err.message : err) };
            ws.send(serialize(errMsg));
          });
      }
    });

    ws.addEventListener("close", (e) => {
      if (pingInterval) clearInterval(pingInterval);
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
      attempt++;
      logger.info("disconnected, reconnecting", { code: e.code, delayMs: delay });
      setTimeout(connect, delay);
    });

    ws.addEventListener("error", () => logger.error("connection error"));
  }

  connect();
}

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
import { Executor } from "./executor.ts";

const RELAY_URL = Bun.env["RELAY_URL"] ?? "ws://localhost:3000/ws";
const TOML_PATH = Bun.env["COMMANDS_TOML"] ?? new URL("../commands.toml", import.meta.url).pathname;

const executor = await Executor.create(TOML_PATH);
const orchestratorId = crypto.randomUUID();
const ws = new WebSocket(RELAY_URL);

ws.addEventListener("open", () => {
  const msg: RegisterMsg = {
    type: "register",
    id: orchestratorId,
    role: "orchestrator",
    meta: { name: Bun.env["ORCHESTRATOR_NAME"] ?? "orchestrator", capabilities: executor.supportedCommands() },
  };
  ws.send(serialize(msg));
  console.log(`[orchestrator] registered id=${orchestratorId} commands=${executor.supportedCommands().join(",")}`);
});

ws.addEventListener("message", (event) => {
  const result = deserialize(event.data as string, OrchestratorBoundMsgSchema);
  if (!result.ok) {
    console.error("[orchestrator] invalid message:", result.error);
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
        console.log(`[orchestrator] completed ${command} for ${requestId}`);
      })
      .catch((err: unknown) => {
        const errMsg: CommandErrorMsg = { type: "command_error", requestId, code: "EXEC_ERROR", message: String(err instanceof Error ? err.message : err) };
        ws.send(serialize(errMsg));
      });
  }
});

ws.addEventListener("close", (e) => console.log(`[orchestrator] disconnected`, e.code));
ws.addEventListener("error", () => console.error(`[orchestrator] connection error`));

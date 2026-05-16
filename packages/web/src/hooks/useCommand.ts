import { useCallback } from "react";
import type {
  CommandName,
  CommandInput,
  CommandOutput,
} from "@ai-orchestration/lib";
import { CommandDefs } from "@ai-orchestration/lib";
import type { RelayClient } from "../relay.ts";

const DEFAULT_TIMEOUT_MS = 30_000;

export type CommandRunner = <K extends CommandName>(
  command: K,
  input: CommandInput<K>,
) => Promise<CommandOutput<K>>;

export function useCommand(
  client: RelayClient | null,
  orchestratorId: string | null,
  onEvent?: (level: "info" | "error", message: string, detail?: unknown) => void,
): CommandRunner {
  return useCallback(
    <K extends CommandName>(command: K, input: CommandInput<K>): Promise<CommandOutput<K>> => {
      if (!client) return Promise.reject(new Error("Relay not connected"));
      if (!orchestratorId) return Promise.reject(new Error("No orchestrator selected"));

      const requestId = crypto.randomUUID();

      return new Promise<CommandOutput<K>>((resolve, reject) => {
        const cleanups: (() => void)[] = [];
        const cleanup = () => {
          for (const fn of cleanups) fn();
        };

        const timer = setTimeout(() => {
          cleanup();
          const err = new Error(`Command "${command}" timed out after ${DEFAULT_TIMEOUT_MS}ms`);
          onEvent?.("error", err.message);
          reject(err);
        }, DEFAULT_TIMEOUT_MS);

        cleanups.push(() => clearTimeout(timer));

        cleanups.push(
          client.on("command_ack", (msg) => {
            if (msg.requestId !== requestId) return;
            onEvent?.("info", `${command} acked by ${msg.orchestratorId}`);
          }),
        );

        cleanups.push(
          client.on("command_progress", (msg) => {
            if (msg.requestId !== requestId) return;
            onEvent?.("info", `${command} progress ${msg.progress}%${msg.message ? `: ${msg.message}` : ""}`);
          }),
        );

        cleanups.push(
          client.on("command_result", (msg) => {
            if (msg.requestId !== requestId) return;
            cleanup();
            const parsed = CommandDefs[command].output.safeParse(msg.output);
            if (!parsed.success) {
              const err = new Error(`Invalid result for ${command}: ${parsed.error.message}`);
              onEvent?.("error", err.message, msg.output);
              reject(err);
              return;
            }
            onEvent?.("info", `${command} result`, parsed.data);
            resolve(parsed.data as CommandOutput<K>);
          }),
        );

        cleanups.push(
          client.on("command_error", (msg) => {
            if (msg.requestId !== requestId) return;
            cleanup();
            const err = new Error(`${msg.code}: ${msg.message}`);
            onEvent?.("error", `${command} error: ${msg.message}`, { code: msg.code });
            reject(err);
          }),
        );

        client.send({
          type: "command_request",
          requestId,
          targetOrchestratorId: orchestratorId,
          command,
          input,
        });
      });
    },
    [client, orchestratorId, onEvent],
  );
}

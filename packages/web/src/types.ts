import type { ClientBoundMsg } from "@ai-orchestration/lib";

export type LogEntry = {
  id: string;
  ts: number;
  level: "info" | "error";
  message: string;
  detail?: unknown;
};

export type RelayEvent = ClientBoundMsg;

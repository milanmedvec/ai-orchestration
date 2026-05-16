import {
  ClientBoundMsgSchema,
  serialize,
  deserialize,
  type InboundMsg,
  type ClientBoundMsg,
  type RegisterMsg,
} from "@ai-orchestration/lib";
import { uuid } from "./uuid.ts";

type ClientBoundMsgMap = { [T in ClientBoundMsg as T["type"]]: T };
type MsgHandler<T> = (msg: T) => void;
type Handlers = Partial<{ [K in keyof ClientBoundMsgMap]: MsgHandler<ClientBoundMsgMap[K]>[] }>;

export type RelayStatus = "connecting" | "open" | "closed" | "error";

export interface RelayClient {
  id: string;
  status(): RelayStatus;
  send(msg: InboundMsg): void;
  on<K extends keyof ClientBoundMsgMap>(type: K, handler: MsgHandler<ClientBoundMsgMap[K]>): () => void;
  onStatus(handler: (status: RelayStatus) => void): () => void;
  close(): void;
}

export function connect(url: string, name: string): RelayClient {
  const id = uuid();
  const handlers: Handlers = {};
  const statusHandlers = new Set<(s: RelayStatus) => void>();
  let currentStatus: RelayStatus = "connecting";

  const setStatus = (s: RelayStatus) => {
    currentStatus = s;
    for (const h of statusHandlers) h(s);
  };

  const ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    const reg: RegisterMsg = {
      type: "register",
      id,
      role: "client",
      meta: { name },
    };
    ws.send(serialize(reg));
    setStatus("open");
  });

  ws.addEventListener("message", (event) => {
    const result = deserialize(event.data as string, ClientBoundMsgSchema);
    if (!result.ok) {
      console.error("invalid message from server", result.error);
      return;
    }
    dispatch(handlers, result.data);
  });

  ws.addEventListener("error", () => setStatus("error"));
  ws.addEventListener("close", () => setStatus("closed"));

  return {
    id,
    status: () => currentStatus,
    send(outbound) {
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn("relay send while socket not open", { state: ws.readyState });
        return;
      }
      ws.send(serialize(outbound));
    },
    on(type, handler) {
      const list = (handlers[type] ??= []) as MsgHandler<ClientBoundMsgMap[typeof type]>[];
      list.push(handler);
      return () => {
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
      };
    },
    onStatus(handler) {
      statusHandlers.add(handler);
      handler(currentStatus);
      return () => statusHandlers.delete(handler);
    },
    close() {
      ws.close(1000);
    },
  };
}

function dispatch(handlers: Handlers, msg: ClientBoundMsg): void {
  const list = handlers[msg.type as keyof Handlers] as MsgHandler<ClientBoundMsg>[] | undefined;
  if (list) {
    for (const h of list.slice()) h(msg);
  }
}

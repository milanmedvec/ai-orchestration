import {
  ClientBoundMsgSchema,
  serialize,
  deserialize,
  type InboundMsg,
  type ClientBoundMsg,
  type RegisterMsg,
  type OrchestratorListMsg,
} from "@ai-orchestration/lib";
import type { Logger } from "@ai-orchestration/lib/logger";

type ClientBoundMsgMap = { [T in ClientBoundMsg as T["type"]]: T };
type MsgHandler<T> = (msg: T) => void;
type Handlers = Partial<{ [K in keyof ClientBoundMsgMap]: MsgHandler<ClientBoundMsgMap[K]>[] }>;

export interface RelayClient {
  id: string;
  send(msg: InboundMsg): void;
  on<K extends keyof ClientBoundMsgMap>(type: K, handler: MsgHandler<ClientBoundMsgMap[K]>): void;
  close(): void;
}

export function connect(url: string, name: string, logger: Logger): Promise<RelayClient> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const handlers: Handlers = {};
    let initialList: OrchestratorListMsg | null = null;
    const ws = new WebSocket(url);

    ws.addEventListener("error", () => reject(new Error(`Failed to connect to relay at ${url}`)));

    ws.addEventListener("open", () => {
      const reg: RegisterMsg = {
        type: "register",
        id,
        role: "client",
        meta: { name: name ?? id },
      };
      ws.send(serialize(reg));
    });

    ws.addEventListener("message", (event) => {
      const result = deserialize(event.data as string, ClientBoundMsgSchema);
      if (!result.ok) {
        logger.error("invalid message from server", { error: result.error });
        return;
      }

      const msg = result.data;
      if (msg.type === "orchestrator_list") {
        initialList = msg;

        const client: RelayClient = {
          id,
          send(outbound) {
            ws.send(serialize(outbound));
          },
          on(type, handler) {
            const list = (handlers[type] ??= []) as MsgHandler<ClientBoundMsgMap[typeof type]>[];
            list.push(handler);

            // Replay the initial orchestrator_list for handlers registered after resolve
            if (type === "orchestrator_list" && initialList) {
              (handler as MsgHandler<ClientBoundMsgMap["orchestrator_list"]>)(initialList);
            }
          },
          close() {
            ws.close();
          },
        };

        dispatch(handlers, msg);
        resolve(client);
        return;
      }

      dispatch(handlers, msg);
    });

    ws.addEventListener("close", (e) => {
      if (e.code !== 1000) {
        reject(new Error(`WebSocket closed unexpectedly (code ${e.code})`));
      }
    });
  });
}

function dispatch(handlers: Handlers, msg: ClientBoundMsg): void {
  const list = handlers[msg.type as keyof Handlers] as MsgHandler<ClientBoundMsg>[] | undefined;
  if (list) {
    for (const h of list) h(msg);
  }
}

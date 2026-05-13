import type {
  InboundMsg,
  ClientBoundMsg,
  OrchestratorListMsg,
  RegisterMsg,
} from "@ai-orchestration/lib";

type MsgHandler<T extends ClientBoundMsg> = (msg: T) => void;
type Handlers = Partial<{ [T in ClientBoundMsg as T["type"]]: MsgHandler<T>[] }>;

export interface RelayClient {
  id: string;
  send(msg: InboundMsg): void;
  on<T extends ClientBoundMsg>(type: T["type"], handler: MsgHandler<T>): void;
  close(): void;
}

export function connect(url: string, name?: string): Promise<RelayClient> {
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
      ws.send(JSON.stringify(reg));
    });

    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data as string) as ClientBoundMsg;

      if (msg.type === "orchestrator_list") {
        initialList = msg;

        const client: RelayClient = {
          id,
          send(outbound) {
            ws.send(JSON.stringify(outbound));
          },
          on(type, handler) {
            const list = (handlers[type] ??= []) as MsgHandler<typeof msg>[];
            list.push(handler as MsgHandler<typeof msg>);
            // Replay the initial orchestrator_list for handlers registered after resolve
            if (type === "orchestrator_list" && initialList) {
              (handler as MsgHandler<OrchestratorListMsg>)(initialList);
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
  const list = handlers[msg.type as keyof Handlers] as MsgHandler<typeof msg>[] | undefined;
  if (list) {
    for (const h of list) h(msg);
  }
}

import type {
  RegisterMsg,
  TaskAckMsg,
  TaskResultMsg,
  OrchestratorBoundMsg,
} from "@ai-orchestration/lib";

const RELAY_URL = process.env["RELAY_URL"] ?? "ws://localhost:3000/ws";
const orchestratorId = crypto.randomUUID();

const ws = new WebSocket(RELAY_URL);

ws.addEventListener("open", () => {
  const msg: RegisterMsg = {
    type: "register",
    id: orchestratorId,
    role: "orchestrator",
    meta: { name: "orchestrator-stub", capabilities: ["echo"] },
  };
  ws.send(JSON.stringify(msg));
  console.log(`[orchestrator] registered id=${orchestratorId}`);
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data as string) as OrchestratorBoundMsg;
  console.log(`[orchestrator] received`, JSON.stringify(msg, null, 2));

  if (msg.type === "task_dispatch") {
    const ack: TaskAckMsg = {
      type: "task_ack",
      requestId: msg.requestId,
      orchestratorId,
    };
    ws.send(JSON.stringify(ack));

    setTimeout(() => {
      const result: TaskResultMsg = {
        type: "task_result",
        requestId: msg.requestId,
        result: { echo: msg.payload },
      };
      ws.send(JSON.stringify(result));
      console.log(`[orchestrator] sent task_result for ${msg.requestId}`);
    }, 500);
  }
});

ws.addEventListener("close", (e) => console.log(`[orchestrator] disconnected`, e.code));
ws.addEventListener("error", () => console.error(`[orchestrator] connection error`));

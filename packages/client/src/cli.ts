import { program } from "commander";
import { connect } from "./relay.ts";
import type { TaskRequestMsg } from "@ai-orchestration/lib";

const DEFAULT_RELAY = process.env["RELAY_URL"] ?? "ws://localhost:3000/ws";

program
  .name("ai-client")
  .description("CLI client for the ai-orchestration relay")
  .option("--relay <url>", "relay server URL", DEFAULT_RELAY)
  .option("--name <name>", "client display name", process.env["HOSTNAME"] ?? "client");

// ── orchestrators ─────────────────────────────────────────────────────────────

program
  .command("orchestrators")
  .description("list connected orchestrators")
  .action(async () => {
    const opts = program.opts<{ relay: string; name: string }>();
    const relay = await connect(opts.relay, opts.name).catch(bail);

    relay.on("orchestrator_list", (msg) => {
      if (msg.orchestrators.length === 0) {
        console.log("No orchestrators connected.");
      } else {
        console.log(`${"ID".padEnd(38)}  ${"Name".padEnd(20)}  Capabilities`);
        console.log("-".repeat(80));
        for (const o of msg.orchestrators) {
          const name = String(o.meta?.["name"] ?? "—").padEnd(20);
          const caps = (o.meta?.["capabilities"] as string[] | undefined)?.join(", ") ?? "—";
          console.log(`${o.id.padEnd(38)}  ${name}  ${caps}`);
        }
      }
      relay.close();
      process.exit(0);
    });
  });

// ── task ──────────────────────────────────────────────────────────────────────

program
  .command("task <prompt>")
  .description("send a task to an orchestrator")
  .option("--orchestrator <id>", "target orchestrator ID (default: first available)")
  .option("--timeout <ms>", "result wait timeout in ms", "30000")
  .action(async (prompt: string, cmdOpts: { orchestrator?: string; timeout: string }) => {
    const opts = program.opts<{ relay: string; name: string }>();
    const relay = await connect(opts.relay, opts.name).catch(bail);

    const requestId = crypto.randomUUID();
    const timeout = Number(cmdOpts.timeout);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const done = () => {
      clearTimeout(timer);
      relay.close();
    };

    relay.on("orchestrator_list", (msg) => {
      const targetId = cmdOpts.orchestrator ?? msg.orchestrators[0]?.id;
      if (!targetId) {
        console.error("No orchestrators available.");
        done();
        process.exit(1);
      }

      const req: TaskRequestMsg = {
        type: "task_request",
        requestId,
        targetOrchestratorId: targetId,
        payload: { prompt },
      };
      relay.send(req);
      console.log(`Sent task ${requestId} → ${targetId}`);

      timer = setTimeout(() => {
        console.error(`Timed out waiting for result (${timeout}ms)`);
        relay.close();
        process.exit(1);
      }, timeout);
    });

    relay.on("task_ack", (msg) => {
      if (msg.requestId !== requestId) return;
      console.log(`Acknowledged by ${msg.orchestratorId}`);
    });

    relay.on("task_progress", (msg) => {
      if (msg.requestId !== requestId) return;
      const label = msg.message ? ` — ${msg.message}` : "";
      console.log(`Progress: ${msg.progress}%${label}`);
    });

    relay.on("task_result", (msg) => {
      if (msg.requestId !== requestId) return;
      console.log("Result:");
      console.log(JSON.stringify(msg.result, null, 2));
      done();
      process.exit(0);
    });

    relay.on("task_error", (msg) => {
      if (msg.requestId !== requestId) return;
      console.error(`Error [${msg.code}]: ${msg.message}`);
      done();
      process.exit(1);
    });
  });

program.parseAsync().catch(bail);

function bail(err: unknown): never {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
}

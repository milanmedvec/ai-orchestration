import { program } from "commander";
import { connect, type RelayClient } from "./relay.ts";
import type { CommandName, CommandRequestMsg } from "@ai-orchestration/lib";

const DEFAULT_RELAY = Bun.env["RELAY_URL"] ?? "ws://localhost:3000/ws";

program
  .name("ai-client")
  .description("CLI client for the ai-orchestration relay")
  .option("--relay <url>", "relay server URL", DEFAULT_RELAY)
  .option("--name <name>", "client display name", Bun.env["HOSTNAME"] ?? "client")
  .option("--orchestrator <id>", "target orchestrator ID (default: first available)")
  .option("--timeout <ms>", "result wait timeout in ms", "30000");

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

// ── list-projects ─────────────────────────────────────────────────────────────

program
  .command("list-projects")
  .description("list all projects on an orchestrator")
  .action(async () => {
    const opts = program.opts<GlobalOpts>();
    await runCommand(opts, "list_projects", {});
  });

// ── create-project ────────────────────────────────────────────────────────────

program
  .command("create-project <name>")
  .description("create a new project")
  .option("--repo-url <url>", "git repository URL")
  .action(async (name: string, cmdOpts: { repoUrl?: string }) => {
    const opts = program.opts<GlobalOpts>();
    await runCommand(opts, "create_project", { name, repoUrl: cmdOpts.repoUrl ?? "" });
  });

// ── list-sessions ─────────────────────────────────────────────────────────────

program
  .command("list-sessions <projectId>")
  .description("list sessions for a project")
  .action(async (projectId: string) => {
    const opts = program.opts<GlobalOpts>();
    await runCommand(opts, "list_sessions", { projectId });
  });

// ── create-session ────────────────────────────────────────────────────────────

program
  .command("create-session <projectId>")
  .description("create a new session for a project")
  .action(async (projectId: string) => {
    const opts = program.opts<GlobalOpts>();
    await runCommand(opts, "create_session", { projectId });
  });

// ── terminate-session ─────────────────────────────────────────────────────────

program
  .command("terminate-session <sessionId>")
  .description("terminate an existing session")
  .action(async (sessionId: string) => {
    const opts = program.opts<GlobalOpts>();
    await runCommand(opts, "terminate_session", { sessionId });
  });

program.parseAsync().catch(bail);

// ── Shared helpers ────────────────────────────────────────────────────────────

interface GlobalOpts {
  relay: string;
  name: string;
  orchestrator?: string;
  timeout: string;
}

async function runCommand(opts: GlobalOpts, command: CommandName, input: Record<string, unknown>): Promise<void> {
  const relay = await connect(opts.relay, opts.name).catch(bail);
  const requestId = crypto.randomUUID();
  const timeout = Number(opts.timeout);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const done = (code = 0) => {
    clearTimeout(timer);
    relay.close();
    process.exit(code);
  };

  relay.on("orchestrator_list", (msg) => {
    const targetId = opts.orchestrator ?? msg.orchestrators[0]?.id;
    if (!targetId) {
      console.error("No orchestrators available.");
      done(1);
    }

    const req: CommandRequestMsg = {
      type: "command_request",
      requestId,
      targetOrchestratorId: targetId!,
      command,
      input,
    };
    relay.send(req);

    timer = setTimeout(() => {
      console.error(`Timed out waiting for result (${timeout}ms)`);
      relay.close();
      process.exit(1);
    }, timeout);
  });

  relay.on("command_ack", (msg) => {
    if (msg.requestId !== requestId) return;
    console.error(`[ack] ${msg.orchestratorId}`);
  });

  relay.on("command_progress", (msg) => {
    if (msg.requestId !== requestId) return;
    const label = msg.message ? ` — ${msg.message}` : "";
    console.error(`[progress] ${msg.progress}%${label}`);
  });

  relay.on("command_result", (msg) => {
    if (msg.requestId !== requestId) return;
    console.log(JSON.stringify(msg.output, null, 2));
    done(0);
  });

  relay.on("command_error", (msg) => {
    if (msg.requestId !== requestId) return;
    console.error(`Error [${msg.code}]: ${msg.message}`);
    done(1);
  });
}

function bail(err: unknown): never {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
}

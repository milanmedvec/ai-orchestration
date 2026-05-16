import { init } from "./context.ts";
import { createCommand, type Command } from "commander";
import { connect } from "./relay.ts";
import type { CommandName, CommandRequestMsg } from "@ai-orchestration/lib";
import type { Context } from "./context.ts";

type GlobalOpts = {
  relay: string;
  name: string;
  orchestrator?: string;
  timeout: string;
};

async function runCommand(
  opts: GlobalOpts,
  command: CommandName,
  input: Record<string, unknown>,
  context: Context,
): Promise<void> {
  const { logger } = context;

  const relay = await connect(opts.relay, opts.name, logger).catch((err: unknown) => {
    logger.error("failed to connect to relay", { error: err });
    process.exit(1);
  });

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
      logger.error("no orchestrators available");
      done(1);
      return;
    }

    const req: CommandRequestMsg = {
      type: "command_request",
      requestId,
      targetOrchestratorId: targetId,
      command,
      input,
    };
    relay.send(req);

    timer = setTimeout(() => {
      logger.error("timed out waiting for result", { timeoutMs: timeout });
      relay.close();
      process.exit(1);
    }, timeout);
  });

  relay.on("command_ack", (msg) => {
    if (msg.requestId !== requestId) return;
    logger.debug("ack received", { orchestratorId: msg.orchestratorId });
  });

  relay.on("command_progress", (msg) => {
    if (msg.requestId !== requestId) return;
    logger.info("progress", { progress: msg.progress, message: msg.message });
  });

  relay.on("command_result", (msg) => {
    if (msg.requestId !== requestId) return;
    console.log(JSON.stringify(msg.output, null, 2));
    done(0);
  });

  relay.on("command_error", (msg) => {
    if (msg.requestId !== requestId) return;
    logger.error("command error", { code: msg.code, message: msg.message });
    done(1);
  });
}

export function createClientCommands(program: Command, context: Context): void {
  const { logger } = context;

  program
    .command("orchestrators")
    .description("list connected orchestrators")
    .action(async () => {
      const opts = program.opts<{ relay: string; name: string }>();
      const relay = await connect(opts.relay, opts.name, logger).catch((err: unknown) => {
        logger.error("failed to connect to relay", { error: err });
        process.exit(1);
      });

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

  program
    .command("list-projects")
    .description("list all projects on an orchestrator")
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      await runCommand(opts, "list_projects", {}, context);
    });

  program
    .command("create-project <name>")
    .description("create a new project")
    .option("--repo-url <url>", "git repository URL")
    .action(async (name: string, cmdOpts: { repoUrl?: string }) => {
      const opts = program.opts<GlobalOpts>();
      await runCommand(opts, "create_project", { name, repoUrl: cmdOpts.repoUrl ?? "" }, context);
    });

  program
    .command("list-sessions <projectId>")
    .description("list sessions for a project")
    .action(async (projectId: string) => {
      const opts = program.opts<GlobalOpts>();
      await runCommand(opts, "list_sessions", { projectId }, context);
    });

  program
    .command("create-session <projectId> <featureName>")
    .description("create a new session for a project")
    .action(async (projectId: string, featureName: string) => {
      const opts = program.opts<GlobalOpts>();
      await runCommand(opts, "create_session", { projectId, name: featureName }, context);
    });

  program
    .command("terminate-session <sessionId>")
    .description("terminate an existing session")
    .action(async (sessionId: string) => {
      const opts = program.opts<GlobalOpts>();
      await runCommand(opts, "terminate_session", { sessionId }, context);
    });
}

const cliBuilder = {
  build(context: Context): Command {
    const program = createCommand()
      .name("ai-client")
      .description("CLI client for the ai-orchestration relay")
      .option("--relay <url>", "relay server URL", context.config.RELAY_URL)
      .option("--name <name>", "client display name", context.config.HOSTNAME ?? "client")
      .option("--orchestrator <id>", "target orchestrator ID (default: first available)")
      .option("--timeout <ms>", "result wait timeout in ms", "30000");

    createClientCommands(program, context);

    return program;
  },
};

function main() {
  const context = init(Bun.env);

  try {
    const program = cliBuilder.build(context);
    program.parseAsync(process.argv).catch((error) => {
      context.logger.error("CLI error", { error });
      process.exit(1);
    });
  } catch (error) {
    context.logger.error("CLI error", { error });
    process.exit(1);
  }
}

main();

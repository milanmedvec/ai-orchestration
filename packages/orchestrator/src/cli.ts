import { init } from "./context.ts";
import { createCommand, type Command } from "commander";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { CommandDefs, type CommandName } from "@ai-orchestration/lib";
import { Executor } from "./executor.ts";
import type { Context } from "./context.ts";

async function runCommand(
  tomlPath: string,
  command: CommandName,
  rawInput: Record<string, unknown>,
  context: Context,
): Promise<void> {
  const executor = await Executor.create(tomlPath);

  const def = CommandDefs[command];
  const inputResult = def.input.safeParse(rawInput);
  if (!inputResult.success) {
    throw new Error(inputResult.error.errors[0]?.message ?? "Invalid input");
  }

  const rawOutput = await executor.run(command, inputResult.data as Record<string, unknown>);

  const outputResult = def.output.safeParse(rawOutput);
  if (!outputResult.success) {
    throw new Error(outputResult.error.errors[0]?.message ?? "Invalid output");
  }

  console.log(JSON.stringify(outputResult.data, null, 2));
}

export function createOrchestratorCommands(program: Command, context: Context): void {
  const { logger } = context;

  program
    .command("list-projects")
    .description("list all projects")
    .action(async () => {
      const { toml } = program.opts<{ toml: string }>();

      try {
        await runCommand(toml, "list_projects", {}, context);
      } catch (error) {
        logger.error("command failed", { error });
        process.exit(1);
      }
    });

  program
    .command("create-project <name>")
    .description("create a new project")
    .option("--repo-url <url>", "git repository URL", "")
    .action(async (name: string, cmdOpts: { repoUrl: string }) => {
      const { toml } = program.opts<{ toml: string }>();

      try {
        await runCommand(toml, "create_project", { name, repoUrl: cmdOpts.repoUrl }, context);
      } catch (error) {
        logger.error("command failed", { error });
        process.exit(1);
      }
    });

  program
    .command("list-sessions <projectId>")
    .description("list sessions for a project")
    .action(async (projectId: string) => {
      const { toml } = program.opts<{ toml: string }>();

      try {
        await runCommand(toml, "list_sessions", { projectId }, context);
      } catch (error) {
        logger.error("command failed", { error });
        process.exit(1);
      }
    });

  program
    .command("create-session <projectId> <featureName>")
    .description("create a new session for a project")
    .action(async (projectId: string, featureName: string) => {
      const { toml } = program.opts<{ toml: string }>();

      try {
        await runCommand(toml, "create_session", { projectId, name: featureName }, context);
      } catch (error) {
        logger.error("command failed", { error });
        process.exit(1);
      }
    });

  program
    .command("terminate-session <sessionId>")
    .description("terminate an existing session")
    .action(async (sessionId: string) => {
      const { toml } = program.opts<{ toml: string }>();

      try {
        await runCommand(toml, "terminate_session", { sessionId }, context);
      } catch (error) {
        logger.error("command failed", { error });
        process.exit(1);
      }
    });

  program
    .command("spawn-shell")
    .description("spawn an interactive bash shell inside the container rootfs")
    .action(async () => {
      const templatePath = context.config.CONTAINER_TEMPLATE;
      const rootfs = Bun.env["ROOTFS_DIR"] ?? join(Bun.env["HOME"] ?? "/root", ".local/share/ai-orchestration/rootfs");
      const containerId = `shell-${crypto.randomUUID().slice(0, 8)}`;

      let template: Record<string, unknown>;
      try {
        template = JSON.parse(await Bun.file(templatePath).text());
      } catch (error) {
        logger.error("failed to read container template", { error, path: templatePath });
        process.exit(1);
        return;
      }

      const config = {
        ...template,
        root: { ...(template.root as object), path: rootfs },
        hostname: containerId,
        process: {
          ...(template.process as object),
          args: ["/bin/bash"],
          cwd: "/root",
        },
        mounts: (template.mounts as Array<{ destination: string }>).filter(
          (m) => m.destination !== "/project"
        ),
      };

      const bundleDir = mkdtempSync("/tmp/ai-shell-");

      try {
        await Bun.write(join(bundleDir, "config.json"), JSON.stringify(config, null, 2));

        const proc = Bun.spawn(["runc", "run", "--bundle", bundleDir, containerId], {
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        });

        await proc.exited;
      } finally {
        rmSync(bundleDir, { recursive: true });
      }
    });
}

const cliBuilder = {
  build(context: Context): Command {
    const program = createCommand()
      .name("ai-orchestrator")
      .description("CLI for invoking orchestrator commands directly")
      .option("--toml <path>", "path to commands.toml", context.config.COMMANDS_TOML);

    createOrchestratorCommands(program, context);

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

import { program } from "commander";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { CommandDefs, type CommandName } from "@ai-orchestration/lib";
import { Executor } from "./executor.ts";

const DEFAULT_TOML = Bun.env["COMMANDS_TOML"] ?? new URL("../commands.toml", import.meta.url).pathname;

program
  .name("ai-orchestrator")
  .description("CLI for invoking orchestrator commands directly")
  .option("--toml <path>", "path to commands.toml", DEFAULT_TOML);

// ── list-projects ─────────────────────────────────────────────────────────────

program
  .command("list-projects")
  .description("list all projects")
  .action(async () => {
    const { toml } = program.opts<{ toml: string }>();
    await runCommand(toml, "list_projects", {});
  });

// ── create-project ────────────────────────────────────────────────────────────

program
  .command("create-project <name>")
  .description("create a new project")
  .option("--repo-url <url>", "git repository URL", "")
  .action(async (name: string, cmdOpts: { repoUrl: string }) => {
    const { toml } = program.opts<{ toml: string }>();
    await runCommand(toml, "create_project", { name, repoUrl: cmdOpts.repoUrl });
  });

// ── list-sessions ─────────────────────────────────────────────────────────────

program
  .command("list-sessions <projectId>")
  .description("list sessions for a project")
  .action(async (projectId: string) => {
    const { toml } = program.opts<{ toml: string }>();
    await runCommand(toml, "list_sessions", { projectId });
  });

// ── create-session ────────────────────────────────────────────────────────────

program
  .command("create-session <projectId>")
  .description("create a new session for a project")
  .action(async (projectId: string) => {
    const { toml } = program.opts<{ toml: string }>();
    await runCommand(toml, "create_session", { projectId });
  });

// ── terminate-session ─────────────────────────────────────────────────────────

program
  .command("terminate-session <sessionId>")
  .description("terminate an existing session")
  .action(async (sessionId: string) => {
    const { toml } = program.opts<{ toml: string }>();
    await runCommand(toml, "terminate_session", { sessionId });
  });

// ── spawn-shell ───────────────────────────────────────────────────────────────

program
  .command("spawn-shell")
  .description("spawn an interactive bash shell inside the container rootfs (no project)")
  .action(async () => {
    const { toml } = program.opts<{ toml: string }>();
    const templatePath = join(dirname(toml), "commands", "config.json.template");
    const rootfs = Bun.env["ROOTFS_DIR"] ?? join(Bun.env["HOME"] ?? "/root", ".local/share/ai-orchestration/rootfs");
    const containerId = `shell-${crypto.randomUUID().slice(0, 8)}`;

    let template: Record<string, unknown>;
    try {
      template = JSON.parse(await Bun.file(templatePath).text());
    } catch {
      bail(new Error(`Failed to read template: ${templatePath}`));
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

program.parseAsync().catch(bail);

// ── Shared helpers ────────────────────────────────────────────────────────────

async function runCommand(tomlPath: string, command: CommandName, rawInput: Record<string, unknown>): Promise<void> {
  const executor = await Executor.create(tomlPath).catch(bail);

  const def = CommandDefs[command];
  const inputResult = def.input.safeParse(rawInput);
  if (!inputResult.success) {
    bail(new Error(inputResult.error.errors[0]?.message ?? "Invalid input"));
  }

  const rawOutput = await executor.run(command, inputResult.data as Record<string, unknown>).catch(bail);

  const outputResult = def.output.safeParse(rawOutput);
  if (!outputResult.success) {
    bail(new Error(outputResult.error.errors[0]?.message ?? "Invalid output"));
  }

  console.log(JSON.stringify(outputResult.data, null, 2));
}

function bail(err: unknown): never {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
}

interface CommandDef {
  run: string;
}

interface TomlConfig {
  commands: Record<string, CommandDef>;
}

export class Executor {
  private defs: Record<string, CommandDef>;

  private constructor(defs: Record<string, CommandDef>) {
    this.defs = defs;
  }

  static async create(tomlPath: string): Promise<Executor> {
    const raw = await Bun.file(tomlPath).text();
    const config = Bun.TOML.parse(raw) as TomlConfig;
    return new Executor(config.commands ?? {});
  }

  supportedCommands(): string[] {
    return Object.keys(this.defs);
  }

  async run(command: string, input: Record<string, unknown>): Promise<unknown> {
    const def = this.defs[command];
    if (!def) throw new Error(`Command not configured: ${command}`);

    let cmd = def.run;
    for (const [k, v] of Object.entries(input)) {
      cmd = cmd.replaceAll(`{{${k}}}`, String(v));
    }

    const proc = Bun.spawn(["sh", "-c", cmd], { stdout: "pipe", stderr: "pipe" });
    const [stdout, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ]);

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(stderr.trim() || `Command exited with code ${exitCode}`);
    }

    try {
      return JSON.parse(stdout.trim());
    } catch {
      throw new Error(`Command output is not valid JSON: ${stdout.trim().slice(0, 100)}`);
    }
  }
}

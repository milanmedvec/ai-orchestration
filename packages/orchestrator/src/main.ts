import { init } from "./context.ts";
import { Executor } from "./executor.ts";
import { startOrchestrator } from "./orchestrator.ts";

async function main() {
  const context = init(Bun.env);

  try {
    const executor = await Executor.create(context.config.COMMANDS_TOML);
    startOrchestrator(context, executor);
  } catch (error) {
    context.logger.error("Error occurred", { error });
    process.exit(1);
  }
}

main();

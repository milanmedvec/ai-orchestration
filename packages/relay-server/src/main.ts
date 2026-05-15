import { init } from "./context.ts";
import { startServer } from "./server.ts";

function main() {
  const context = init(Bun.env);

  try {
    startServer(context);
  } catch (error) {
    context.logger.error("Error occurred", { error });
    process.exit(1);
  }
}

main();

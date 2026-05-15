import { loadConfig } from "@ai-orchestration/lib/config";
import { loggerFactory, type Logger } from "@ai-orchestration/lib/logger";
import { ConfigSchema, type Config } from "./config.ts";

export type Context = {
  config: Config;
  logger: Logger;
};

export function init(env: unknown): Context {
  const config = loadConfig(ConfigSchema, env);
  const logger = loggerFactory.createLogger();

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", { error });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection", { error: { promise, reason } });
  });

  return { config, logger };
}

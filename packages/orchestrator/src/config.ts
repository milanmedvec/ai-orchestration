import { z } from "zod";

const defaultCommandsToml = new URL("../config/commands.toml", import.meta.url).pathname;
const defaultContainerTemplate = new URL("../config/container.json.template", import.meta.url).pathname;

export const ConfigSchema = z.object({
  RELAY_URL: z.string().default("ws://localhost:3000/ws"),
  COMMANDS_TOML: z.string().default(defaultCommandsToml),
  ORCHESTRATOR_NAME: z.string().default("orchestrator"),
  CONTAINER_TEMPLATE: z.string().default(defaultContainerTemplate),
  AUTH_TOKEN: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

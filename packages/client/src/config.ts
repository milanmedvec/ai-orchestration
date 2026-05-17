import { z } from "zod";

export const ConfigSchema = z.object({
  RELAY_URL: z.string().default("ws://localhost:3000/ws"),
  HOSTNAME: z.string().optional(),
  AUTH_TOKEN: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

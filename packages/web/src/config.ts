import { z } from "zod";

const ConfigSchema = z.object({
  RELAY_URL: z.string(),
  AUTH_TOKEN: z.string().optional(),
});

export const config = ConfigSchema.parse({
  RELAY_URL: import.meta.env.VITE_RELAY_URL ?? "ws://localhost:3000/ws",
  AUTH_TOKEN: import.meta.env.VITE_AUTH_TOKEN as string | undefined,
});

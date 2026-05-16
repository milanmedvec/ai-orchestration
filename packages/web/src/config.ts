import { z } from "zod";

export const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3001),
  RELAY_URL: z.string().default("ws://localhost:3000/ws"),
});

export type Config = z.infer<typeof ConfigSchema>;

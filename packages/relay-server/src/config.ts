import { z } from "zod";

export const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  AUTH_TOKEN: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

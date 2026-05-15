import type { z } from "zod";

export function loadConfig<C extends z.ZodObject<any, any, any>>(schema: C, seed: unknown): z.infer<C> {
  const result = schema.safeParse(seed);
  if (result.success) return result.data;
  throw new Error(`Invalid config: ${JSON.stringify(result.error.errors)}`);
}

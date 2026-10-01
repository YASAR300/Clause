import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string({ required_error: "DATABASE_URL is required" })
    .min(1, "DATABASE_URL cannot be empty"),
  DIRECT_URL: z
    .string({ required_error: "DIRECT_URL is required" })
    .min(1, "DIRECT_URL cannot be empty"),
  BLOB_READ_WRITE_TOKEN: z
    .string({ required_error: "BLOB_READ_WRITE_TOKEN is required" })
    .min(1, "BLOB_READ_WRITE_TOKEN cannot be empty"),
  AI_API_KEY: z
    .string({ required_error: "AI_API_KEY is required" })
    .min(1, "AI_API_KEY cannot be empty"),
  AI_BASE_URL: z
    .string({ required_error: "AI_BASE_URL is required" })
    .min(1, "AI_BASE_URL cannot be empty"),
  AI_MODEL: z
    .string({ required_error: "AI_MODEL is required" })
    .min(1, "AI_MODEL cannot be empty"),
  AI_FAST_MODEL: z.string().optional(),
  AI_MAX_CONTEXT_CHARS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
});

export function getEnv(customEnv = process.env) {
  const result = envSchema.safeParse(customEnv);
  if (!result.success) {
    const missingVars = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new Error(
      `Invalid environment configuration. Missing or invalid variables: ${missingVars}`
    );
  }
  return result.data;
}

let cachedEnv = null;

export const env = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!cachedEnv) {
        cachedEnv = getEnv();
      }
      return cachedEnv[prop];
    },
  }
);

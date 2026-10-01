import { describe, it, expect } from "vitest";
import { getEnv } from "@/lib/env";

describe("lib/env", () => {
  it("throws a clear error when required variables are missing", () => {
    expect(() => getEnv({})).toThrow(/DATABASE_URL/);
  });

  it("passes validation when all required variables are present", () => {
    const valid = getEnv({
      DATABASE_URL: "postgresql://localhost:5432/db",
      DIRECT_URL: "postgresql://localhost:5432/db",
      BLOB_READ_WRITE_TOKEN: "mock_token",
      AI_API_KEY: "sk-mock",
      AI_BASE_URL: "https://api.openai.com/v1",
      AI_MODEL: "gpt-4o",
    });

    expect(valid.AI_MODEL).toBe("gpt-4o");
    expect(valid.DATABASE_URL).toBe("postgresql://localhost:5432/db");
  });
});

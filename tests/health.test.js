import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/health/route";

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

describe("GET /api/health", () => {
  it("returns ok: true when database is healthy", async () => {
    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true });
  });
});

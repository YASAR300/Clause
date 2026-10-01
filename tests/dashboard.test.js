import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/dashboard/route";
import { POST } from "@/app/api/sample/route";

describe("Dashboard & Sample APIs", () => {
  it("ingests a sample contract through POST /api/sample", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.documentId).toBeDefined();
  });

  it("computes accurate stats and returns activity feed in GET /api/dashboard", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats).toBeDefined();
    expect(data.stats.documentsReady).toBeGreaterThanOrEqual(1);
    expect(data.recentDocuments).toBeDefined();
    expect(data.activityFeed).toBeDefined();
  });
});

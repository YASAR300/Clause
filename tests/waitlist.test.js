import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/waitlist/route";

describe("POST /api/waitlist", () => {
  it("rejects invalid emails with validation error", async () => {
    const req = new Request("http://localhost:3000/api/waitlist", {
      method: "POST",
      body: JSON.stringify({ email: "invalid-email" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts valid email and persists entry", async () => {
    const randomEmail = `test_${Date.now()}@example.com`;
    const req = new Request("http://localhost:3000/api/waitlist", {
      method: "POST",
      body: JSON.stringify({ email: randomEmail }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});

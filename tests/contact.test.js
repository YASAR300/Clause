import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/contact/route";

describe("POST /api/contact", () => {
  it("rejects invalid contact payloads", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      body: JSON.stringify({ name: "", email: "bad-email", message: "hi" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts valid contact submission and saves to database", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Counselor",
        email: "counselor@firm.com",
        message: "We need cross-document comparison verification for our standard M&A agreements.",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});

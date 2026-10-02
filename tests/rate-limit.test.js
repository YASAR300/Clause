import { describe, it, expect, beforeEach } from "vitest";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

describe("IP Rate Limiter", () => {
  it("extracts client IP from x-forwarded-for header", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    expect(getClientIp(req)).toBe("203.0.113.195");
  });

  it("falls back to 127.0.0.1 if no forwarding headers exist", () => {
    const req = new Request("http://localhost/api/test");
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("allows requests under the limit and blocks excess requests", () => {
    const testIp = `test-ip-${Date.now()}`;
    const max = 3;
    const windowMs = 5000;

    const r1 = checkIpRateLimit(testIp, { max, windowMs });
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkIpRateLimit(testIp, { max, windowMs });
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkIpRateLimit(testIp, { max, windowMs });
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request must be blocked
    const r4 = checkIpRateLimit(testIp, { max, windowMs });
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetInMs).toBeGreaterThan(0);
  });
});

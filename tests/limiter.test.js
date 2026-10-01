import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TokenRateLimiter } from "@/lib/ai/limiter";

describe("TokenRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("executes tasks immediately when token budget allows", async () => {
    const limiter = new TokenRateLimiter({ tokensPerMinute: 2000 });
    const fn = vi.fn().mockResolvedValue("result");

    const promise = limiter.execute(fn, { estimatedTokens: 500 });
    const result = await promise;

    expect(result).toBe("result");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(limiter.getUsedTokens()).toBe(500);
  });

  it("delays tasks and invokes onWait when tokens exceed window capacity", async () => {
    const limiter = new TokenRateLimiter({ tokensPerMinute: 1000 });
    const onWait = vi.fn();
    const task1 = vi.fn().mockResolvedValue("done 1");
    const task2 = vi.fn().mockResolvedValue("done 2");

    await limiter.execute(task1, { estimatedTokens: 800 });
    expect(limiter.getUsedTokens()).toBe(800);

    // Second task requires 400 tokens, which exceeds 1000 total in window
    const promise2 = limiter.execute(task2, { estimatedTokens: 400, onWait });

    // Flush microtasks so queue runs and calculateWaitMs triggers onWait
    await Promise.resolve();

    expect(onWait).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "rate_limit",
        message: expect.stringMatching(
          /Waiting for the model's rate limit, retrying in \d+s/
        ),
      })
    );

    // Fast forward 61 seconds so first request rolls out of 60s window
    await vi.advanceTimersByTimeAsync(61000);

    const result2 = await promise2;
    expect(result2).toBe("done 2");
    expect(task2).toHaveBeenCalledTimes(1);
  });

  it("handles HTTP 429 by inspecting retry-after header and retrying", async () => {
    const limiter = new TokenRateLimiter({ tokensPerMinute: 5000 });
    const onWait = vi.fn();
    let calls = 0;

    const task = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls === 1) {
        const error = new Error("Rate limit exceeded");
        error.status = 429;
        error.headers = { "retry-after": "8" };
        throw error;
      }
      return "recovered";
    });

    const promise = limiter.execute(task, {
      estimatedTokens: 100,
      onWait,
      maxRetries: 3,
    });

    // Advance timers by 8s to complete retry delay
    await vi.advanceTimersByTimeAsync(8000);

    const result = await promise;
    expect(result).toBe("recovered");
    expect(calls).toBe(2);
    expect(onWait).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "rate_limit",
        message: "Waiting for the model's rate limit, retrying in 8s",
        retryIn: 8,
      })
    );
  });

  it("caps retry-after wait at 30 seconds", async () => {
    const limiter = new TokenRateLimiter({ tokensPerMinute: 5000 });
    const onWait = vi.fn();

    const task = vi.fn().mockImplementation(async () => {
      const error = new Error("Rate limit exceeded");
      error.status = 429;
      error.headers = { "retry-after": "120" }; // Requesting 120s
      throw error;
    });

    const promise = limiter.execute(task, {
      estimatedTokens: 100,
      onWait,
      maxRetries: 1,
    });

    const caught = promise.catch((err) => err);

    // Flush microtasks for queue resolution and async rejection
    await Promise.resolve();
    await Promise.resolve();

    expect(onWait).toHaveBeenCalledWith(
      expect.objectContaining({
        retryIn: 30, // Capped at 30s
      })
    );

    await vi.advanceTimersByTimeAsync(30000);
    const err = await caught;
    expect(err.message).toBe("Rate limit exceeded");
  });
});

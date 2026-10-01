import { describe, it, expect } from "vitest";
import {
  createCoverageTracker,
  recordChunkSuccess,
  recordChunkFailure,
} from "@/lib/ai/coverage";
import { batchChunks, estimateTokens } from "@/lib/ai/budget";

describe("lib/ai/coverage", () => {
  it("tracks analyzed and failed chunks accurately", () => {
    const tracker = createCoverageTracker(3);
    expect(tracker.complete).toBe(true);

    recordChunkSuccess(tracker, ["chunk-1", "chunk-2"]);
    expect(tracker.analyzedChunks).toEqual(["chunk-1", "chunk-2"]);
    expect(tracker.complete).toBe(true);

    recordChunkFailure(tracker, ["chunk-3"], new Error("Timeout"));
    expect(tracker.failedChunks).toEqual(["chunk-3"]);
    expect(tracker.complete).toBe(false);
  });
});

describe("lib/ai/budget", () => {
  it("estimates tokens from character count", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("1234")).toBe(1);
    expect(estimateTokens("12345678")).toBe(2);
  });

  it("batches small chunks within context budget", () => {
    const chunks = [
      { id: "1", text: "a".repeat(1000) },
      { id: "2", text: "b".repeat(1000) },
      { id: "3", text: "c".repeat(4000) },
    ];

    // Budget of 3500 chars with 1000 overhead => 2500 per batch
    const batches = batchChunks(chunks, 3500, 1000);
    expect(batches.length).toBe(2);
    expect(batches[0].map((c) => c.id)).toEqual(["1", "2"]);
    expect(batches[1].map((c) => c.id)).toEqual(["3"]);
  });
});

import { describe, it, expect } from "vitest";
import { computeWordDiff } from "@/lib/compare/diff";

describe("Word-level Diff Utility", () => {
  it("computes additions, deletions and unchanged words correctly", () => {
    const base = "Liability is capped at AED 100,000 for all claims.";
    const revised = "Liability is capped at AED 1,000,000 for all claims.";

    const diff = computeWordDiff(base, revised);

    expect(diff.some((t) => t.type === "removed")).toBe(true);
    expect(diff.some((t) => t.type === "added")).toBe(true);
    expect(diff.some((t) => t.type === "unchanged")).toBe(true);

    const removedToken = diff.find((t) => t.type === "removed");
    const addedToken = diff.find((t) => t.type === "added");

    expect(removedToken.value).toContain("100");
    expect(addedToken.value).toContain("1");
  });

  it("handles completely new or deleted clauses", () => {
    const addedDiff = computeWordDiff("", "Entirely new clause.");
    expect(addedDiff).toEqual([{ type: "added", value: "Entirely new clause." }]);

    const removedDiff = computeWordDiff("Deleted clause.", "");
    expect(removedDiff).toEqual([{ type: "removed", value: "Deleted clause." }]);

    const identicalDiff = computeWordDiff("Identical text", "Identical text");
    expect(identicalDiff).toEqual([{ type: "unchanged", value: "Identical text" }]);
  });
});

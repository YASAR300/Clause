import { describe, it, expect } from "vitest";
import { extractDistinctiveTerms } from "@/lib/retrieval/search";
import { expandQueryRuleBased } from "@/lib/retrieval/expand";
import { mergePageRanges } from "@/lib/retrieval/pack";

describe("Retrieval Term Extraction & Expansion", () => {
  it("extracts distinctive terms ignoring legal stopwords", () => {
    const terms = extractDistinctiveTerms(
      "What are the termination notice requirements under this agreement?"
    );
    expect(terms).toContain("termination");
    expect(terms).toContain("notice");
    expect(terms).toContain("requirements");
    expect(terms).toContain("agreement");
    expect(terms).not.toContain("what");
    expect(terms).not.toContain("the");
    expect(terms).not.toContain("under");
    expect(terms).not.toContain("this");
  });

  it("expands query with legal domain synonyms rule-based", () => {
    const expanded = expandQueryRuleBased("Can either party terminate for convenience?");
    expect(expanded).toContain("terminate");
    expect(expanded).toContain("cancellation");
    expect(expanded).toContain("expiry");
    expect(expanded).toContain("notice");
  });
});

describe("Page Range Interval Merging", () => {
  it("merges adjacent and overlapping page intervals", () => {
    const merged = mergePageRanges([
      [1, 3],
      [3, 5],
      [10, 12],
      [13, 15],
    ]);
    expect(merged).toEqual([
      [1, 5],
      [10, 15],
    ]);
  });

  it("handles single page and empty ranges", () => {
    expect(mergePageRanges([])).toEqual([]);
    expect(mergePageRanges([[4, 4]])).toEqual([[4, 4]]);
  });
});

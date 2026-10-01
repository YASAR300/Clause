import { describe, it, expect } from "vitest";
import { classifyStrategy, STRATEGY_MODES } from "@/lib/retrieval/strategy";
import {
  createCoverageObject,
  buildCoveragePrompt,
  guardAbsenceClaims,
  isAbsenceAnswer,
} from "@/lib/retrieval/coverage";

describe("Strategy Router Classification", () => {
  const largeDocument = {
    id: "doc-large",
    charCount: 250000,
    pageCount: 50,
  };

  const smallDocument = {
    id: "doc-small",
    charCount: 15000,
    pageCount: 4,
  };

  it("selects WHOLE when document fits within context budget", async () => {
    const strategy = await classifyStrategy(
      "Is there a non-compete clause?",
      smallDocument,
      60000
    );
    expect(strategy).toBe(STRATEGY_MODES.WHOLE);
  });

  it("selects EXHAUSTIVE for existence or absence questions", async () => {
    const q1 = "is there a termination for convenience clause?";
    const q2 = "does it mention force majeure?";
    const q3 = "is there any non-compete restriction anywhere?";

    expect(await classifyStrategy(q1, largeDocument, 60000)).toBe(
      STRATEGY_MODES.EXHAUSTIVE
    );
    expect(await classifyStrategy(q2, largeDocument, 60000)).toBe(
      STRATEGY_MODES.EXHAUSTIVE
    );
    expect(await classifyStrategy(q3, largeDocument, 60000)).toBe(
      STRATEGY_MODES.EXHAUSTIVE
    );
  });

  it("selects EXHAUSTIVE for aggregation and summary queries", async () => {
    expect(
      await classifyStrategy("list all indemnification obligations", largeDocument, 60000)
    ).toBe(STRATEGY_MODES.EXHAUSTIVE);
    expect(
      await classifyStrategy("summarise the whole contract", largeDocument, 60000)
    ).toBe(STRATEGY_MODES.EXHAUSTIVE);
  });

  it("selects RETRIEVAL for targeted clause questions", async () => {
    const q1 = "what is the payment term in clause 4?";
    const q2 = "in section 12.3, what is the governing law?";
    const q3 = "when is the effective date?";

    expect(await classifyStrategy(q1, largeDocument, 60000)).toBe(
      STRATEGY_MODES.RETRIEVAL
    );
    expect(await classifyStrategy(q2, largeDocument, 60000)).toBe(
      STRATEGY_MODES.RETRIEVAL
    );
    expect(await classifyStrategy(q3, largeDocument, 60000)).toBe(
      STRATEGY_MODES.RETRIEVAL
    );
  });
});

describe("Coverage Object Rules & Guarantees", () => {
  it("marks retrieval mode as complete: false by definition", () => {
    const cov = createCoverageObject({
      mode: "retrieval",
      totalChunks: 100,
      chunksRead: 15,
      pagesRead: [[1, 5]],
      totalPages: 40,
    });
    expect(cov.complete).toBe(false);
  });

  it("marks exhaustive mode complete only when all chunks succeeded and no empty pages", () => {
    const successCov = createCoverageObject({
      mode: "exhaustive",
      totalChunks: 30,
      chunksRead: 30,
      pagesRead: [[1, 30]],
      totalPages: 30,
      failedChunks: [],
      emptyPages: [],
    });
    expect(successCov.complete).toBe(true);

    const partialCov = createCoverageObject({
      mode: "exhaustive",
      totalChunks: 30,
      chunksRead: 28,
      pagesRead: [[1, 28]],
      totalPages: 30,
      failedChunks: ["chunk-29", "chunk-30"],
      emptyPages: [],
    });
    expect(partialCov.complete).toBe(false);

    const emptyPageCov = createCoverageObject({
      mode: "whole",
      totalChunks: 5,
      chunksRead: 5,
      pagesRead: [[1, 5]],
      totalPages: 5,
      emptyPages: [3],
    });
    expect(emptyPageCov.complete).toBe(false);
  });

  it("builds plain language prompt with partial coverage instructions", () => {
    const partialCov = createCoverageObject({
      mode: "retrieval",
      totalChunks: 80,
      chunksRead: 6,
      pagesRead: [[1, 4], [12, 15]],
      totalPages: 50,
    });

    const prompt = buildCoveragePrompt(partialCov);
    expect(prompt).toContain("DOCUMENT COVERAGE: PARTIAL");
    expect(prompt).toContain("pages 1-4, 12-15");
    expect(prompt).toContain("CRITICAL RULE");
    expect(prompt).toContain("You have NOT read the rest of the document");
  });
});

describe("Code-Level Absence Guard (guardAbsenceClaims)", () => {
  it("detects absence assertions accurately", () => {
    expect(isAbsenceAnswer("The contract does not contain a non-compete clause.")).toBe(true);
    expect(isAbsenceAnswer("There is no provision regarding force majeure.")).toBe(true);
    expect(isAbsenceAnswer("Section 4 specifies payment is net 30 days.")).toBe(false);
  });

  it("prepends deterministic warning notice when coverage is partial and answer claims absence", () => {
    const partialCov = createCoverageObject({
      mode: "retrieval",
      totalChunks: 100,
      chunksRead: 10,
      pagesRead: [[1, 8]],
      totalPages: 60,
    });

    const answer = "The agreement does not contain any termination for convenience clause.";
    const guarded = guardAbsenceClaims(answer, partialCov);

    expect(guarded).toContain("**Notice**: Not found in the passages reviewed (10 of 100 sections, pages 1-8).");
    expect(guarded).toContain("This is not confirmation that it is absent from the entire contract.");
    expect(guarded).toContain(answer);
  });

  it("leaves answer unchanged when coverage is complete", () => {
    const completeCov = createCoverageObject({
      mode: "exhaustive",
      totalChunks: 50,
      chunksRead: 50,
      pagesRead: [[1, 50]],
      totalPages: 50,
    });

    const answer = "The agreement does not contain a non-compete clause.";
    const guarded = guardAbsenceClaims(answer, completeCov);
    expect(guarded).toBe(answer);
  });
});

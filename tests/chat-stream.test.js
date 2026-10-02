import { describe, it, expect } from "vitest";
import { CiteStreamParser } from "@/lib/ai/cite-parser";
import { findQuote } from "@/lib/verify/quotes";
import { guardAbsenceClaims, createCoverageObject } from "@/lib/retrieval";

describe("Chat Streaming & Tamper Detection Engine", () => {
  const contractText = `
CONFIDENTIAL MASTER SERVICES AGREEMENT

Section 4. Payment and Fees
Payment shall be made in AED 100,000 within thirty (30) business days following receipt of an undisputed invoice.

Section 9. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of the Dubai International Financial Centre (DIFC).
`.trim();

  const pages = [
    { pageNumber: 1, startOffset: 0, endOffset: contractText.length },
  ];

  it("verifies genuine quote extracted from the stream", () => {
    let capturedCitation = null;
    const parser = new CiteStreamParser({
      onCitation: (c) => {
        capturedCitation = c;
      },
    });

    const streamChunk =
      'The consideration is set at AED 100,000 payable within 30 days <cite doc="D1">Payment shall be made in AED 100,000 within thirty (30) business days</cite> from invoice.';
    parser.feed(streamChunk);
    const result = parser.end();

    expect(capturedCitation).not.toBeNull();
    expect(result.cleanText).toBe(
      "The consideration is set at AED 100,000 payable within 30 days [1] from invoice."
    );

    // Verify quote against ground-truth document
    const verification = findQuote(contractText, pages, capturedCitation.quoteText);
    expect(verification.verified).toBe(true);
    expect(verification.matchCount).toBe(1);
    expect(verification.matches[0].pageStart).toBe(1);
    expect(contractText.slice(verification.matches[0].start, verification.matches[0].end)).toBe(
      capturedCitation.quoteText
    );
  });

  it("flags a tampered quote as Unverified when AI alters text or numbers", () => {
    let capturedCitation = null;
    const parser = new CiteStreamParser({
      onCitation: (c) => {
        capturedCitation = c;
      },
    });

    // Deliberate tamper: changed AED 100,000 to AED 1,000,000
    const tamperedChunk =
      'Payment terms require one million AED <cite doc="D1">Payment shall be made in AED 1,000,000 within thirty (30) business days</cite>.';
    parser.feed(tamperedChunk);
    parser.end();

    expect(capturedCitation).not.toBeNull();
    const verification = findQuote(contractText, pages, capturedCitation.quoteText);

    // Tampered quote must fail verification
    expect(verification.verified).toBe(false);
    expect(verification.matchCount).toBe(0);
    expect(verification.reason).toBe("wording differs from document");
  });

  it("handles not_found signal when clause is absent from document", () => {
    let notFoundTriggered = false;
    const parser = new CiteStreamParser({
      onNotFound: () => {
        notFoundTriggered = true;
      },
    });

    parser.feed("<not_found/> The contract contains no non-compete provisions.");
    const result = parser.end();

    expect(notFoundTriggered).toBe(true);
    expect(result.isNotFound).toBe(true);
    expect(result.cleanText).toBe("The contract contains no non-compete provisions.");

    // Guard test: if coverage is partial, absence guard prepends notice
    const partialCoverage = createCoverageObject({
      mode: "retrieval",
      totalChunks: 10,
      chunksRead: 2,
      pagesRead: [[1, 1]],
      totalPages: 10,
    });

    const guarded = guardAbsenceClaims(result.cleanText, partialCoverage);
    expect(guarded).toContain("**Notice**: Not found in the passages reviewed");
    expect(guarded).toContain("This is not confirmation that it is absent from the entire contract.");
  });

  it("retains partial text and handles unclosed cite when stopped mid-answer", () => {
    const parser = new CiteStreamParser();

    // Stream stops abruptly mid-tag
    parser.feed("First factual claim established. <cite doc=\"D1\">Payment shall be made in AED 100,000");
    const result = parser.end();

    // Unclosed citation is dropped from citations
    expect(result.citations.length).toBe(0);
    // Partial text is retained
    expect(result.cleanText).toContain("First factual claim established.");
    expect(result.cleanText).toContain("Payment shall be made in AED 100,000");
  });
});

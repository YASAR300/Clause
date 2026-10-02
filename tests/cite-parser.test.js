import { describe, it, expect } from "vitest";
import { CiteStreamParser } from "@/lib/ai/cite-parser";

describe("CiteStreamParser State Machine", () => {
  it("parses clean text and inline citation from whole string", () => {
    const emittedText = [];
    const emittedCitations = [];

    const parser = new CiteStreamParser({
      onText: (t) => emittedText.push(t),
      onCitation: (c) => emittedCitations.push(c),
    });

    parser.feed(
      'The payment is due net 30 days <cite doc="D1">Payment shall be made in AED 100,000 within thirty (30) business days</cite> from invoice.'
    );
    const result = parser.end();

    expect(result.cleanText).toBe(
      "The payment is due net 30 days [1] from invoice."
    );
    expect(result.citations.length).toBe(1);
    expect(result.citations[0]).toEqual({
      ordinal: 1,
      docId: "D1",
      quoteText:
        "Payment shall be made in AED 100,000 within thirty (30) business days",
    });
  });

  it("handles 1-character-at-a-time streaming feeds", () => {
    const raw =
      'Termination notice is 60 days <cite doc="D2">Either party may terminate on sixty (60) days notice</cite>.';
    const emittedCitations = [];

    const parser = new CiteStreamParser({
      onCitation: (c) => emittedCitations.push(c),
    });

    for (const char of raw) {
      parser.feed(char);
    }
    const result = parser.end();

    expect(result.cleanText).toBe("Termination notice is 60 days [1].");
    expect(emittedCitations.length).toBe(1);
    expect(emittedCitations[0].docId).toBe("D2");
    expect(emittedCitations[0].quoteText).toBe(
      "Either party may terminate on sixty (60) days notice"
    );
  });

  it("handles tags split across chunk boundaries", () => {
    const parser = new CiteStreamParser();

    parser.feed("Section 4 states <ci");
    parser.feed('te doc="D1">The Cont');
    parser.feed("ractor shall defend</ci");
    parser.feed("te> in all claims.");
    const result = parser.end();

    expect(result.cleanText).toBe("Section 4 states [1] in all claims.");
    expect(result.citations.length).toBe(1);
    expect(result.citations[0].quoteText).toBe("The Contractor shall defend");
  });

  it("handles stray '<' characters in normal prose without getting stuck", () => {
    const parser = new CiteStreamParser();
    parser.feed("The liability cap is < 5000 USD and not > 10000 USD.");
    const result = parser.end();

    expect(result.cleanText).toBe(
      "The liability cap is < 5000 USD and not > 10000 USD."
    );
    expect(result.citations.length).toBe(0);
  });

  it("drops unclosed cite at the end from citations and displays its text as plain unverified text", () => {
    const parser = new CiteStreamParser();
    parser.feed('Key terms include <cite doc="D1">All liabilities are capped at');
    const result = parser.end();

    // Citation must not be emitted as an official verified cite
    expect(result.citations.length).toBe(0);
    // Unclosed quote text is preserved as plain text
    expect(result.cleanText).toContain("All liabilities are capped at");
  });

  it("detects <not_found/> tag and emits notFound event", () => {
    let notFoundTriggered = false;
    const parser = new CiteStreamParser({
      onNotFound: () => {
        notFoundTriggered = true;
      },
    });

    parser.feed("<not_found/> No non-compete clause was found in the text.");
    const result = parser.end();

    expect(notFoundTriggered).toBe(true);
    expect(result.isNotFound).toBe(true);
    expect(result.cleanText).toBe(
      "No non-compete clause was found in the text."
    );
  });
});

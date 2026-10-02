import { describe, it, expect } from "vitest";
import { normalize, buildIndex, findQuote } from "@/lib/verify/quotes";

describe("Text Normalization and Offset Mapping (buildIndex)", () => {
  it("normalizes unicode NFKC and expands ligatures", () => {
    // \uFB01 = fi ligature, \uFB02 = fl ligature
    const res = normalize("speciﬁc perﬂection");
    expect(res).toBe("specific perflection");
  });

  it("converts curly quotes and typographer dashes to canonical forms", () => {
    const raw = `“The ‘Company’—and its Affiliates–agree.”`;
    const res = normalize(raw);
    expect(res).toBe(`"the 'company'-and its affiliates-agree."`);
  });

  it("removes soft hyphens and zero-width spaces", () => {
    // \u00AD = soft hyphen, \u200B = zero width space
    const raw = "li\u00ADabil\u200Bity";
    expect(normalize(raw)).toBe("liability");
  });

  it("joins words hyphenated across line breaks", () => {
    const raw = "The party shall provide indem-\n   nity to the customer.";
    const { normalized, map } = buildIndex(raw);
    expect(normalized).toBe("the party shall provide indemnity to the customer.");

    // Check that 'indemnity' maps back to the original text correctly
    const matchIdx = normalized.indexOf("indemnity");
    const origStart = map[matchIdx];
    const origEnd = map[matchIdx + "indemnity".length - 1] + 1;
    expect(raw.slice(origStart, origEnd)).toBe("indem-\n   nity");
  });

  it("collapses whitespace runs while preserving offset accuracy", () => {
    const raw = "Payment   shall    be    made   net   30   days.";
    const { normalized, map } = buildIndex(raw);
    expect(normalized).toBe("payment shall be made net 30 days.");

    const matchIdx = normalized.indexOf("net 30 days");
    const origStart = map[matchIdx];
    const origEnd = map[matchIdx + "net 30 days".length - 1] + 1;
    expect(raw.slice(origStart, origEnd)).toBe("net   30   days");
  });
});

describe("Quote Verification Engine (findQuote)", () => {
  const sampleDoc = `
MASTER SERVICES AGREEMENT

Section 4. Payment Terms
Payment shall be made in AED 100,000 within thirty (30) business days following receipt of an undisputed invoice. Late payments shall accrue interest at 1.5% per month.

Section 8. Indemnification and Defense
The Contractor shall defend, indemnify, and hold harmless the Client from and against all Losses arising out of any third-party Claim.

Section 12. Term and Termination
Either party may terminate this Agreement for convenience by providing sixty (60) days prior written notice to the other party. In the event of material breach, termination is effective after ten (10) days written notice.
`.trim();

  const pages = [
    { pageNumber: 1, startOffset: 0, endOffset: 385 },
    { pageNumber: 2, startOffset: 385, endOffset: sampleDoc.length },
  ];

  it("verifies exact verbatim quote", () => {
    const quote = "Payment shall be made in AED 100,000 within thirty (30) business days";
    const res = findQuote(sampleDoc, pages, quote);

    expect(res.verified).toBe(true);
    expect(res.matchCount).toBe(1);
    expect(res.matches[0].pageStart).toBe(1);
    expect(sampleDoc.slice(res.matches[0].start, res.matches[0].end)).toBe(quote);
  });

  it("verifies quotes with different line breaks and extra spacing", () => {
    const quote = "Payment  shall   be   made\n in AED 100,000";
    const res = findQuote(sampleDoc, pages, quote);

    expect(res.verified).toBe(true);
    expect(res.matchCount).toBe(1);
  });

  it("verifies quotes with curly quotes and case differences", () => {
    const quote = `“EITHER PARTY MAY TERMINATE THIS AGREEMENT FOR CONVENIENCE”`;
    const res = findQuote(sampleDoc, pages, quote);

    expect(res.verified).toBe(true);
    expect(res.matchCount).toBe(1);
    expect(res.matches[0].pageStart).toBe(2);
  });

  it("verifies quotes spanning across page break boundaries", () => {
    // Crosses offset 320 (between page 1 and page 2)
    const quote = "third-party Claim. Section 12. Term and Termination";
    const res = findQuote(sampleDoc, pages, quote);

    expect(res.verified).toBe(true);
    expect(res.matches[0].pageStart).toBe(1);
    expect(res.matches[0].pageEnd).toBe(2);
  });

  it("finds multiple duplicate occurrences in the document", () => {
    const duplicateDoc = "Notice shall be delivered in writing. ... Later, notice shall be delivered in writing again.";
    const dupPages = [{ pageNumber: 1, startOffset: 0, endOffset: duplicateDoc.length }];
    const res = findQuote(duplicateDoc, dupPages, "notice shall be delivered in writing");

    expect(res.verified).toBe(true);
    expect(res.matchCount).toBe(2);
    expect(res.matches.length).toBe(2);
  });

  it("verifies quotes with ellipsis fragments (...)", () => {
    const quote = "Payment shall be made in AED 100,000 ... undisputed invoice.";
    const res = findQuote(sampleDoc, pages, quote);

    expect(res.verified).toBe(true);
    expect(res.matchCount).toBe(1);
    const matchedText = sampleDoc.slice(res.matches[0].start, res.matches[0].end);
    expect(matchedText).toContain("AED 100,000");
    expect(matchedText).toContain("undisputed invoice.");
  });

  it("rejects paraphrased quote (MUST FAIL verification)", () => {
    // Paraphrase of: "Either party may terminate this Agreement for convenience by providing sixty (60) days prior written notice"
    const paraphrased = "Either company can cancel this contract at will with 60 days notice";
    const res = findQuote(sampleDoc, pages, paraphrased);

    expect(res.verified).toBe(false);
    expect(res.matchCount).toBe(0);
    expect(res.reason).toBe("wording differs from document");
  });

  it("rejects changed numbers (AED 100,000 vs AED 1,000,000 MUST FAIL)", () => {
    const tamperedNumber = "Payment shall be made in AED 1,000,000 within thirty (30) business days";
    const res = findQuote(sampleDoc, pages, tamperedNumber);

    expect(res.verified).toBe(false);
    expect(res.matchCount).toBe(0);
    expect(res.reason).toBe("wording differs from document");
  });

  it("detects quotes from the wrong document and marks reason accordingly", () => {
    const otherDoc = {
      id: "doc-2",
      name: "Employment Agreement",
      fullText: "The Employee covenants not to compete for a period of twelve (12) months following termination.",
      pages: [{ pageNumber: 1, startOffset: 0, endOffset: 120 }],
    };

    const quoteFromOther = "Employee covenants not to compete for a period of twelve (12) months";
    const res = findQuote(sampleDoc, pages, quoteFromOther, {
      otherDocuments: [otherDoc],
    });

    expect(res.verified).toBe(false);
    expect(res.reason).toBe("found in a different document");
  });

  it("rejects quotes shorter than 8 characters", () => {
    const shortQuote = "Payment";
    const res = findQuote(sampleDoc, pages, shortQuote);

    expect(res.verified).toBe(false);
    expect(res.reason).toBe("too short to verify");
  });

  it("rejects empty or whitespace-only quotes", () => {
    expect(findQuote(sampleDoc, pages, "").verified).toBe(false);
    expect(findQuote(sampleDoc, pages, "   ").verified).toBe(false);
    expect(findQuote(sampleDoc, pages, null).verified).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import {
  extractHeading,
  findPageForOffset,
  chunkContract,
  TARGET_CHUNK_CHARS,
  MAX_CHUNK_CHARS,
  OVERLAP_CHARS,
} from "@/lib/chunking";

describe("Heading Extraction", () => {
  it("detects numbered clause headings", () => {
    expect(extractHeading("1. Definitions and Interpretation")).toBe(
      "1. Definitions and Interpretation"
    );
    expect(extractHeading("12.3 Indemnification & Liability")).toBe(
      "12.3 Indemnification & Liability"
    );
    expect(extractHeading("4.1.2 Specific Performance")).toBe(
      "4.1.2 Specific Performance"
    );
    expect(extractHeading("  10. Governing Law  ")).toBe(
      "10. Governing Law"
    );
  });

  it("detects Article, Section, Clause, Schedule, and Exhibit headings", () => {
    expect(extractHeading("ARTICLE IV - REPRESENTATIONS AND WARRANTIES")).toBe(
      "ARTICLE IV - REPRESENTATIONS AND WARRANTIES"
    );
    expect(extractHeading("ARTICLE XIV: INDEMNITY")).toBe(
      "ARTICLE XIV: INDEMNITY"
    );
    expect(extractHeading("Section 5. Confidentiality")).toBe(
      "Section 5. Confidentiality"
    );
    expect(extractHeading("Section II. Consideration")).toBe(
      "Section II. Consideration"
    );
    expect(extractHeading("Clause 9. Termination")).toBe(
      "Clause 9. Termination"
    );
    expect(extractHeading("Schedule A: Pricing Terms")).toBe(
      "Schedule A: Pricing Terms"
    );
    expect(extractHeading("EXHIBIT 1 - STATEMENT OF WORK")).toBe(
      "EXHIBIT 1 - STATEMENT OF WORK"
    );
    expect(extractHeading("APPENDIX C: SERVICE LEVEL AGREEMENT")).toBe(
      "APPENDIX C: SERVICE LEVEL AGREEMENT"
    );
    expect(extractHeading("ANNEX B - SECURITY STANDARDS")).toBe(
      "ANNEX B - SECURITY STANDARDS"
    );
  });

  it("detects ALL-CAPS lines as headings", () => {
    expect(extractHeading("GOVERNING LAW AND JURISDICTION")).toBe(
      "GOVERNING LAW AND JURISDICTION"
    );
    expect(extractHeading("LIMITATION OF LIABILITY")).toBe(
      "LIMITATION OF LIABILITY"
    );
    expect(extractHeading("CONFIDENTIALITY AND INTELLECTUAL PROPERTY")).toBe(
      "CONFIDENTIALITY AND INTELLECTUAL PROPERTY"
    );
  });

  it("rejects normal sentence text and body paragraphs", () => {
    expect(
      extractHeading(
        "This Agreement is entered into on October 1, 2026 by and between Party A and Party B."
      )
    ).toBeNull();
    expect(
      extractHeading(
        "The Supplier shall deliver the goods within thirty (30) business days."
      )
    ).toBeNull();
    expect(extractHeading("")).toBeNull();
    expect(extractHeading("   ")).toBeNull();
  });
});

describe("Page Offset Binary Search", () => {
  const pages = [
    { pageNumber: 1, startOffset: 0, endOffset: 1000 },
    { pageNumber: 2, startOffset: 1000, endOffset: 2500 },
    { pageNumber: 3, startOffset: 2500, endOffset: 4500 },
    { pageNumber: 4, startOffset: 4500, endOffset: 6000 },
  ];

  it("finds correct page for offsets within page boundaries", () => {
    expect(findPageForOffset(pages, 0)).toBe(1);
    expect(findPageForOffset(pages, 500)).toBe(1);
    expect(findPageForOffset(pages, 1000)).toBe(2);
    expect(findPageForOffset(pages, 1500)).toBe(2);
    expect(findPageForOffset(pages, 2500)).toBe(3);
    expect(findPageForOffset(pages, 5000)).toBe(4);
  });

  it("handles offset out of bounds gracefully", () => {
    expect(findPageForOffset(pages, -50)).toBe(1);
    expect(findPageForOffset(pages, 10000)).toBe(4);
  });
});

describe("Chunking Invariant & Contract Boundaries", () => {
  it("guarantees fullText.slice(startOffset, endOffset) === chunk.text for all chunks", () => {
    const clause1 = "1. Definitions\n" + "In this Agreement, terms shall have the specified meanings. ".repeat(60);
    const clause2 = "\n\n2. Scope of Services\n" + "The Contractor shall provide consulting services in accordance with Schedule A. ".repeat(60);
    const clause3 = "\n\n3. Termination\n" + "Either party may terminate for convenience with 30 days notice. ".repeat(80);
    const clause4 = "\n\nSchedule A: Deliverables\n" + "Deliverables include architecture specifications, audit reports, and test plans. ".repeat(50);

    const fullText = clause1 + clause2 + clause3 + clause4;
    const pages = [
      { pageNumber: 1, startOffset: 0, endOffset: 3000 },
      { pageNumber: 2, startOffset: 3000, endOffset: 7000 },
      { pageNumber: 3, startOffset: 7000, endOffset: fullText.length },
    ];

    const chunks = chunkContract(fullText, pages, "doc-123");
    expect(chunks.length).toBeGreaterThan(1);

    for (const chunk of chunks) {
      // Invariant: exact slice identity
      const expectedText = fullText.slice(chunk.startOffset, chunk.endOffset);
      expect(chunk.text).toBe(expectedText);
      expect(chunk.startOffset).toBeLessThan(chunk.endOffset);
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
      expect(chunk.pageStart).toBeGreaterThanOrEqual(1);
      expect(chunk.pageEnd).toBeGreaterThanOrEqual(chunk.pageStart);
    }
  });

  it("prefers splitting at contract headings", () => {
    const textA = "Section 1. Confidentiality\n" + "All proprietary information shall remain strictly confidential. ".repeat(40);
    const textB = "\n\nSection 2. Non-Disclosure\n" + "Neither party shall disclose confidential terms to any third party. ".repeat(40);
    const fullText = textA + textB;

    const pages = [{ pageNumber: 1, startOffset: 0, endOffset: fullText.length }];
    const chunks = chunkContract(fullText, pages, "doc-test");

    expect(chunks.length).toBe(2);
    expect(chunks[0].heading).toBe("Section 1. Confidentiality");
    expect(chunks[1].heading).toBe("Section 2. Non-Disclosure");
    expect(chunks[1].text.startsWith("Section 2. Non-Disclosure")).toBe(true);
  });

  it("handles contracts without headings by splitting on paragraph breaks", () => {
    const para1 = "This is a long introductory preamble that explains background without any formal numbering. ".repeat(40);
    const para2 = "\n\nFurther background details regarding the contractual parties and relationship. ".repeat(40);
    const fullText = para1 + para2;

    const pages = [{ pageNumber: 1, startOffset: 0, endOffset: fullText.length }];
    const chunks = chunkContract(fullText, pages, "doc-no-headings");

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const chunk of chunks) {
      expect(fullText.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text);
    }
  });

  it("handles mid-clause splits with overlap when clause exceeds max chunk size", () => {
    const longClauseHeader = "Article IX. Environmental Liabilities and Indemnities\n";
    const longBody = "The Purchaser and Seller agree that environmental compliance must meet all state and federal statutory requirements. ".repeat(80);
    const fullText = longClauseHeader + longBody;

    const pages = [{ pageNumber: 1, startOffset: 0, endOffset: fullText.length }];
    const chunks = chunkContract(fullText, pages, "doc-long");

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
      expect(fullText.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text);
    }

    // Mid-clause split must have overlap: chunk 1 startOffset < chunk 0 endOffset
    expect(chunks[1].startOffset).toBeLessThan(chunks[0].endOffset);
  });

  it("handles empty or blank document text gracefully", () => {
    expect(chunkContract("", [])).toEqual([]);
    expect(chunkContract("   \n\n  ", [])).toEqual([]);
    expect(chunkContract(null, [])).toEqual([]);
  });
});

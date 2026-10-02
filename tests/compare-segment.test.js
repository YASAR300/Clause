import { describe, it, expect } from "vitest";
import { segmentDocument, parseHeading } from "@/lib/compare/segment";

describe("Clause Segmentation (lib/compare/segment)", () => {
  it("parses structured headings and clause numbers", () => {
    expect(parseHeading("Section 4.1 Payment Terms")).toEqual({
      number: "4.1",
      title: "Payment Terms",
    });

    expect(parseHeading("ARTICLE XII: INDEMNIFICATION")).toEqual({
      number: "XII",
      title: "INDEMNIFICATION",
    });

    expect(parseHeading("10. Limitation of Liability")).toEqual({
      number: "10",
      title: "Limitation of Liability",
    });
  });

  it("segments a structured contract into numbered clauses with accurate offsets", () => {
    const contract = `
PREAMBLE
This Master Services Agreement is entered into between Client and Contractor.

Section 1. Definitions
"Confidential Information" means all proprietary data.

Section 2. Payment Terms
Payment shall be made in AED 100,000 within thirty (30) days of invoice.

Section 3. Limitation of Liability
Neither party shall be liable for consequential damages. Cap is AED 500,000.
`.trim();

    const units = segmentDocument(contract);
    expect(units.length).toBeGreaterThanOrEqual(3);

    const paymentUnit = units.find((u) => u.heading.includes("Payment Terms"));
    expect(paymentUnit).toBeDefined();
    expect(paymentUnit.number).toBe("2");
    expect(paymentUnit.text).toContain("AED 100,000");

    // Offset invariant: slicing contract by startOffset and endOffset matches text
    for (const unit of units) {
      expect(contract.slice(unit.startOffset, unit.endOffset)).toBe(unit.text);
    }
  });

  it("falls back to paragraph blocks when no explicit headings exist", () => {
    const text = `
First paragraph discussing the general background of the transaction and business purpose.

Second paragraph detailing that contractor will deliver the milestones on a monthly schedule.

Third paragraph stating that all disputes shall be resolved via arbitration in Dubai.
`.trim();

    const units = segmentDocument(text);
    expect(units.length).toBe(3);
    expect(units[0].text).toContain("First paragraph");
    expect(units[1].text).toContain("Second paragraph");
  });
});

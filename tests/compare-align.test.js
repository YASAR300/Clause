import { describe, it, expect } from "vitest";
import { tokenJaccard, charBigramOverlap, computeSimilarity, alignClauses } from "@/lib/compare/align";

describe("Clause Alignment (lib/compare/align)", () => {
  it("computes Token Jaccard and Bigram similarities accurately", () => {
    const s1 = "Payment shall be made in AED 100,000 within thirty days";
    const s2 = "Payment must be made in AED 1,000,000 within thirty days";

    const jaccard = tokenJaccard(s1, s2);
    expect(jaccard).toBeGreaterThan(0.6);

    const bigram = charBigramOverlap(s1, s2);
    expect(bigram).toBeGreaterThan(0.7);

    const combined = computeSimilarity(s1, s2);
    expect(combined).toBeGreaterThan(0.65);
  });

  it("drops identical clauses and detects modified clauses", () => {
    const baseUnits = [
      {
        id: "b1",
        heading: "Section 1. Definitions",
        number: "1",
        text: "Section 1. Definitions\nAll proprietary information shall remain confidential.",
        startOffset: 0,
      },
      {
        id: "b2",
        heading: "Section 2. Liability Cap",
        number: "2",
        text: "Section 2. Liability Cap\nLiability is capped at AED 100,000.",
        startOffset: 100,
      },
    ];

    const revisedUnits = [
      {
        id: "r1",
        heading: "Section 1. Definitions",
        number: "1",
        text: "Section 1. Definitions\nAll proprietary information shall remain confidential.",
        startOffset: 0,
      },
      {
        id: "r2",
        heading: "Section 2. Liability Cap",
        number: "2",
        text: "Section 2. Liability Cap\nLiability is capped at AED 1,000,000.",
        startOffset: 100,
      },
    ];

    const changes = alignClauses(baseUnits, revisedUnits);
    // Section 1 is identical -> dropped. Only Section 2 is modified!
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe("MODIFIED");
    expect(changes[0].heading).toContain("Liability Cap");
    expect(changes[0].baseText).toContain("AED 100,000");
    expect(changes[0].revisedText).toContain("AED 1,000,000");
  });

  it("handles renumbered clauses (different number, matching text)", () => {
    const baseUnits = [
      {
        id: "b1",
        heading: "Section 4. Payment Terms",
        number: "4",
        text: "Section 4. Payment Terms\nPayment shall be made within thirty (30) business days.",
        startOffset: 0,
      },
    ];

    const revisedUnits = [
      {
        id: "r1",
        heading: "Section 7. Payment Terms",
        number: "7",
        text: "Section 7. Payment Terms\nPayment shall be made within forty-five (45) business days.",
        startOffset: 200,
      },
    ];

    const changes = alignClauses(baseUnits, revisedUnits);
    expect(changes).toHaveLength(1);
    expect(changes[0].isRenumbered).toBe(true);
    expect(changes[0].changeType).toBe("MODIFIED");
  });

  it("detects removed and added clauses", () => {
    const baseUnits = [
      {
        id: "b1",
        heading: "Section 3. Non-Compete",
        number: "3",
        text: "Employee covenants not to compete for two years.",
        startOffset: 0,
      },
    ];

    const revisedUnits = [
      {
        id: "r1",
        heading: "Section 9. Data Protection (GDPR)",
        number: "9",
        text: "Each party shall comply with applicable GDPR data protection regulations.",
        startOffset: 0,
      },
    ];

    const changes = alignClauses(baseUnits, revisedUnits);
    expect(changes).toHaveLength(2);

    const removed = changes.find((c) => c.changeType === "REMOVED");
    const added = changes.find((c) => c.changeType === "ADDED");

    expect(removed).toBeDefined();
    expect(removed.heading).toContain("Non-Compete");

    expect(added).toBeDefined();
    expect(added.heading).toContain("Data Protection");
  });
});

import { describe, it, expect } from "vitest";
import { applyGuardrails } from "@/lib/compare/classify";
import { generateComparisonSummary } from "@/lib/compare/summary";

describe("Significance Classification Guardrails (lib/compare/classify)", () => {
  it("promotes changed amounts or durations from MINOR/COSMETIC to at least MAJOR", () => {
    const rawClassification = {
      significance: "COSMETIC",
      category: "payment",
      summary: "Payment timeline changed from 30 days to 60 days.",
      whyItMatters: "Affects cash flow.",
    };

    const change = {
      changeType: "MODIFIED",
      heading: "Payment Terms",
    };

    const facts = [{ type: "duration", before: "30 days", after: "60 days" }];

    const guarded = applyGuardrails(rawClassification, change, facts);
    expect(guarded.significance).toBe("MAJOR");
  });

  it("promotes liability cap changes to CRITICAL", () => {
    const rawClassification = {
      significance: "MAJOR",
      category: "liability",
      summary: "Cap increased from AED 100,000 to AED 1,000,000.",
      whyItMatters: "Exposes company to 10x financial risk.",
    };

    const change = {
      changeType: "MODIFIED",
      heading: "Section 8. Limitation of Liability",
    };

    const facts = [
      { type: "amount", before: "AED 100,000", after: "AED 1,000,000" },
    ];

    const guarded = applyGuardrails(rawClassification, change, facts);
    expect(guarded.significance).toBe("CRITICAL");
  });

  it("promotes ADDED/REMOVED clauses to at least MAJOR if marked COSMETIC", () => {
    const rawClassification = {
      significance: "COSMETIC",
      category: "termination",
      summary: "Termination clause removed.",
      whyItMatters: "Party can no longer cancel for convenience.",
    };

    const change = {
      changeType: "REMOVED",
      heading: "Section 12. Termination for Convenience",
    };

    const guarded = applyGuardrails(rawClassification, change, []);
    expect(guarded.significance).toBe("MAJOR");
  });

  it("preserves COSMETIC significance when no numeric facts changed and legal effect identical", () => {
    const rawClassification = {
      significance: "COSMETIC",
      category: "other",
      summary: "Wording rephrased without legal consequence.",
      whyItMatters: "Clarifies existing intent.",
    };

    const change = {
      changeType: "MODIFIED",
      heading: "Miscellaneous",
    };

    const guarded = applyGuardrails(rawClassification, change, []);
    expect(guarded.significance).toBe("COSMETIC");
  });

  it("generates correct counts and summary structure in generateComparisonSummary", async () => {
    const changes = [
      { significance: "CRITICAL", heading: "Liability", summary: "Cap 10x" },
      { significance: "MAJOR", heading: "Payment", summary: "60 days" },
      { significance: "MAJOR", heading: "Audit", summary: "Annual audit added" },
      { significance: "MINOR", heading: "Notice", summary: "Email allowed" },
      { significance: "COSMETIC", heading: "Intro", summary: "Typo fix" },
    ];

    const summary = await generateComparisonSummary({
      baseDocument: { name: "Contract_v1.pdf" },
      revisedDocument: { name: "Contract_v2.pdf" },
      changes,
    });

    expect(summary.counts.critical).toBe(1);
    expect(summary.counts.major).toBe(2);
    expect(summary.counts.minor).toBe(1);
    expect(summary.counts.cosmetic).toBe(1);
    expect(summary.counts.total).toBe(5);
    expect(summary.topChanges.length).toBeGreaterThanOrEqual(3);
    expect(summary.executiveSummary).toContain("critical");
  });
});

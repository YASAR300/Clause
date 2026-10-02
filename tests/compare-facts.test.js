import { describe, it, expect } from "vitest";
import { extractFactsFromText, extractFactDiffs } from "@/lib/compare/facts";

describe("Deterministic Fact Extraction (lib/compare/facts)", () => {
  it("extracts amounts, percentages, durations, dates, parties, and modals", () => {
    const text = `
Payment shall be made in AED 100,000 within thirty (30) business days following January 15, 2025.
Late payments shall accrue interest at 1.5% per month. The Client retains sole discretion.
`.trim();

    const facts = extractFactsFromText(text);

    expect(facts.amounts).toContain("AED 100,000");
    expect(facts.percentages).toContain("1.5%");
    expect(facts.durations.some((d) => d.includes("30") && d.includes("days"))).toBe(true);
    expect(facts.dates).toContain("January 15, 2025");
    expect(facts.parties).toContain("Client");
    expect(facts.modals).toContain("shall");
    expect(facts.modals).toContain("sole discretion");
  });

  it("diffs currency amount changes accurately (AED 100,000 -> AED 1,000,000)", () => {
    const base = "Total aggregate liability is capped at AED 100,000.";
    const revised = "Total aggregate liability is capped at AED 1,000,000.";

    const diffs = extractFactDiffs(base, revised);
    const amountDiff = diffs.find((d) => d.type === "amount");

    expect(amountDiff).toBeDefined();
    expect(amountDiff.before).toBe("AED 100,000");
    expect(amountDiff.after).toBe("AED 1,000,000");
  });

  it("diffs duration and percentage changes", () => {
    const base = "Cure period is 30 days and penalty interest is 1.5%.";
    const revised = "Cure period is 60 days and penalty interest is 3%.";

    const diffs = extractFactDiffs(base, revised);

    const durDiff = diffs.find((d) => d.type === "duration");
    expect(durDiff).toBeDefined();
    expect(durDiff.before).toBe("30 days");
    expect(durDiff.after).toBe("60 days");

    const pctDiff = diffs.find((d) => d.type === "percentage");
    expect(pctDiff).toBeDefined();
    expect(pctDiff.before).toBe("1.5%");
    expect(pctDiff.after).toBe("3%");
  });

  it("diffs modal term changes (shall -> may, capped -> unlimited)", () => {
    const base = "Contractor shall provide indemnification.";
    const revised = "Contractor may provide indemnification with unlimited liability.";

    const diffs = extractFactDiffs(base, revised);
    const modalDiffs = diffs.filter((d) => d.type === "modal");

    expect(modalDiffs.length).toBeGreaterThanOrEqual(1);
    expect(modalDiffs.some((d) => d.after === "unlimited")).toBe(true);
  });
});

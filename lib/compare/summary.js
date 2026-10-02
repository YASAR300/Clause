import { completeJson, getAiModel } from "@/lib/ai/client";
import { z } from "zod";

const summaryResponseSchema = z.object({
  executiveSummary: z.string().min(10),
});

/**
 * Builds the overall executive summary and counts by significance for a comparison.
 *
 * @param {object} params
 * @param {object} params.baseDocument
 * @param {object} params.revisedDocument
 * @param {Array<object>} params.changes
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{
 *   counts: {
 *     critical: number,
 *     major: number,
 *     minor: number,
 *     cosmetic: number,
 *     unreviewed: number,
 *     total: number
 *   },
 *   executiveSummary: string,
 *   topChanges: Array<{
 *     heading: string,
 *     significance: string,
 *     category: string,
 *     summary: string
 *   }>
 * }>}
 */
export async function generateComparisonSummary({
  baseDocument,
  revisedDocument,
  changes = [],
  signal,
}) {
  const counts = {
    critical: 0,
    major: 0,
    minor: 0,
    cosmetic: 0,
    unreviewed: 0,
    total: changes.length,
  };

  for (const c of changes) {
    const sig = (c.significance || "UNREVIEWED").toLowerCase();
    if (counts[sig] !== undefined) {
      counts[sig]++;
    } else {
      counts.unreviewed++;
    }
  }

  // Top changes: prioritize CRITICAL then MAJOR
  const prioritized = [...changes].sort((a, b) => {
    const rank = { CRITICAL: 4, MAJOR: 3, MINOR: 2, COSMETIC: 1, UNREVIEWED: 0 };
    return (rank[b.significance] || 0) - (rank[a.significance] || 0);
  });

  const topChanges = prioritized.slice(0, 5).map((c) => ({
    heading: c.heading || "Clause",
    significance: c.significance,
    category: c.category,
    summary: c.summary,
  }));

  // Deterministic fallback sentence
  const countParts = [];
  if (counts.critical > 0) countParts.push(`${counts.critical} critical`);
  if (counts.major > 0) countParts.push(`${counts.major} major`);
  if (counts.minor > 0) countParts.push(`${counts.minor} minor`);
  if (counts.cosmetic > 0) countParts.push(`${counts.cosmetic} cosmetic`);
  if (counts.unreviewed > 0) countParts.push(`${counts.unreviewed} unreviewed`);

  const countStr = countParts.length > 0 ? countParts.join(", ") : "no substantive";
  const defaultSummary = `Comparison between "${baseDocument?.name || "Base"}" and "${revisedDocument?.name || "Revised"}" identified ${countStr} changes across ${changes.length} clauses.`;

  // Attempt brief AI summary for top changes
  let executiveSummary = defaultSummary;

  if (changes.length > 0) {
    try {
      const topBulletPoints = topChanges
        .map((tc) => `- [${tc.significance}] ${tc.heading}: ${tc.summary}`)
        .join("\n");

      const prompt = `You are Clause, an expert legal contract comparison system.
Summarize the key differences between these two contract versions in 2 concise plain-English sentences.
Focus on commercial impact, money, and liabilities.

DOCUMENT A: ${baseDocument?.name || "Original Contract"}
DOCUMENT B: ${revisedDocument?.name || "Revised Contract"}
CHANGES BREAKDOWN: ${countStr} (${changes.length} total changes).

KEY CHANGES DETECTED:
${topBulletPoints}

Return valid JSON:
{
  "executiveSummary": "2 clear sentences summarizing the primary shifts and risk changes"
}`;

      const res = await completeJson({
        messages: [{ role: "user", content: prompt }],
        schema: summaryResponseSchema,
        model: getAiModel(true),
        signal,
      });

      if (res?.executiveSummary) {
        executiveSummary = res.executiveSummary.trim();
      }
    } catch {
      // Fallback already assigned
    }
  }

  return {
    counts,
    executiveSummary,
    topChanges,
  };
}

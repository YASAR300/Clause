import { db } from "@/lib/db";
import { registerJobHandler } from "@/lib/jobs";
import { segmentDocument } from "./segment";
import { alignClauses } from "./align";
import { extractFactDiffs } from "./facts";
import { classifyAllChanges } from "./classify";
import { generateComparisonSummary } from "./summary";

/**
 * Runs the complete document comparison pipeline for a given comparison ID.
 *
 * @param {string} comparisonId
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>} The completed comparison record
 */
export async function processComparison(comparisonId, signal) {
  // 1. Fetch comparison and both documents
  const comparison = await db.comparison.findUnique({
    where: { id: comparisonId },
    include: {
      baseDocument: true,
      revisedDocument: true,
    },
  });

  if (!comparison) {
    throw new Error(`Comparison ${comparisonId} not found`);
  }

  // Mark as PROCESSING
  await db.comparison.update({
    where: { id: comparisonId },
    data: { status: "PROCESSING" },
  });

  try {
    const { baseDocument, revisedDocument } = comparison;

    if (!baseDocument || !revisedDocument) {
      throw new Error("Both base and revised documents must exist");
    }

    // 2. Segmentation into clause-level units
    const baseUnits = segmentDocument(baseDocument.fullText || "");
    const revisedUnits = segmentDocument(revisedDocument.fullText || "");

    // 3. Alignment by heading and text similarity
    const alignedChanges = alignClauses(baseUnits, revisedUnits);

    // 4. Deterministic fact extraction
    const changesWithFacts = alignedChanges.map((change) => {
      const facts =
        change.changeType === "MODIFIED" || change.changeType === "MOVED"
          ? extractFactDiffs(change.baseText, change.revisedText)
          : [];
      return {
        ...change,
        facts,
      };
    });

    // 5. LLM classification with deterministic guardrails (batched)
    const classifiedChanges = await classifyAllChanges(changesWithFacts, 4, signal);

    // 6. Generate overall summary and metrics
    const overallSummary = await generateComparisonSummary({
      baseDocument,
      revisedDocument,
      changes: classifiedChanges,
      signal,
    });

    // 7. Persist changes in ComparisonChange table in a transaction
    await db.$transaction(async (tx) => {
      // Clear previous changes if retry
      await tx.comparisonChange.deleteMany({
        where: { comparisonId },
      });

      // Insert all classified changes
      for (const c of classifiedChanges) {
        await tx.comparisonChange.create({
          data: {
            comparisonId,
            changeType: c.changeType,
            significance: c.significance,
            category: c.category,
            heading: c.heading,
            baseText: c.baseText,
            revisedText: c.revisedText,
            baseStart: c.baseStart,
            revisedStart: c.revisedStart,
            summary: c.summary,
            whyItMatters: c.whyItMatters,
            facts: c.facts || [],
            position: c.position,
          },
        });
      }

      // Update comparison record to READY with summary
      await tx.comparison.update({
        where: { id: comparisonId },
        data: {
          status: "READY",
          summary: overallSummary,
        },
      });
    });

    return await db.comparison.findUnique({
      where: { id: comparisonId },
      include: {
        changes: { orderBy: { position: "asc" } },
        baseDocument: true,
        revisedDocument: true,
      },
    });
  } catch (err) {
    console.error(`Comparison ${comparisonId} failed:`, err);
    await db.comparison.update({
      where: { id: comparisonId },
      data: {
        status: "FAILED",
        summary: { error: err.message },
      },
    });
    throw err;
  }
}

// Register job handler with background worker
registerJobHandler("COMPARISON_PROCESS", async (payload) => {
  return processComparison(payload.comparisonId);
});

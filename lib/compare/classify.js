import { z } from "zod";
import { completeJson, getAiModel } from "@/lib/ai/client";

export const classificationSchema = z.object({
  significance: z.enum(["CRITICAL", "MAJOR", "MINOR", "COSMETIC"]),
  category: z.enum([
    "liability",
    "payment",
    "termination",
    "IP",
    "confidentiality",
    "governing_law",
    "term",
    "warranty",
    "other",
  ]),
  summary: z.string().min(5),
  whyItMatters: z.string().min(5),
});

/**
 * Concurrency worker runner
 */
async function runWithConcurrency(items, concurrency, fn) {
  if (!items || items.length === 0) return [];
  const results = new Array(items.length);
  let currentIdx = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (currentIdx < items.length) {
        const i = currentIdx++;
        results[i] = await fn(items[i], i);
      }
    }
  );

  await Promise.all(workers);
  return results;
}

/**
 * Applies deterministic guardrails to LLM significance classification.
 *
 * Rules:
 * 1. If facts show a changed amount, duration, or percentage, significance MUST BE at least MAJOR.
 * 2. If liability cap changes or amount increases/decreases substantially, promote to CRITICAL.
 * 3. ADDED or REMOVED clauses default to at least MAJOR unless the change is clearly trivial.
 *
 * @param {object} classification
 * @param {object} change
 * @param {Array<object>} facts
 * @returns {object}
 */
export function applyGuardrails(classification, change, facts = []) {
  let { significance, category, summary, whyItMatters } = classification;

  const hasAmountChange = facts.some((f) => f.type === "amount");
  const hasDurationChange = facts.some((f) => f.type === "duration");
  const hasPercentageChange = facts.some((f) => f.type === "percentage");

  // Rule 1: Amounts, durations, and percentages CANNOT be COSMETIC or MINOR
  if (hasAmountChange || hasDurationChange || hasPercentageChange) {
    if (significance === "COSMETIC" || significance === "MINOR") {
      significance = "MAJOR";
    }
  }

  // Rule 2: Substantial liability changes or cap alterations -> CRITICAL
  const headingLower = (change.heading || "").toLowerCase();
  const isLiability =
    headingLower.includes("liability") ||
    headingLower.includes("indemn") ||
    category === "liability";

  if (isLiability && hasAmountChange) {
    significance = "CRITICAL";
    category = "liability";
  }

  // Rule 3: Added/Removed clauses default to at least MAJOR
  if (change.changeType === "ADDED" || change.changeType === "REMOVED") {
    if (significance === "COSMETIC") {
      significance = "MAJOR";
    }
  }

  return {
    significance,
    category,
    summary,
    whyItMatters,
  };
}

/**
 * Classifies a single change item using fast LLM with fallback guardrails.
 *
 * @param {object} change
 * @param {Array<object>} facts
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>}
 */
export async function classifySingleChange(change, facts = [], signal) {
  const factsDescription =
    facts.length > 0
      ? facts.map((f) => `- ${f.type.toUpperCase()}: "${f.before}" -> "${f.after}"`).join("\n")
      : "No structured numeric or modal fact differences detected.";

  const prompt = `You are Clause, an expert contract comparison analyst.
Analyze the following contractual change and categorize its legal significance.

RULES:
1. A reworded sentence with the same legal effect is COSMETIC.
2. A change to money, payment schedules, time limits, liability, rights, or obligations is NOT cosmetic (it is MAJOR or CRITICAL).
3. Liability cap changes, unlimited liability triggers, or severe indemnity shifts are CRITICAL.
4. Provide a 1-2 sentence plain-language summary of what changed in substance, and explain why it matters to the parties.

CLAUSE HEADING: "${change.heading || "Untitled Clause"}"
CHANGE TYPE: ${change.changeType}

DETERMINISTIC FACTS EXTRACTED:
${factsDescription}

BASE TEXT (BEFORE):
"""
${(change.baseText || "(none)").slice(0, 2000)}
"""

REVISED TEXT (AFTER):
"""
${(change.revisedText || "(none)").slice(0, 2000)}
"""

Return valid JSON with:
{
  "significance": "CRITICAL" | "MAJOR" | "MINOR" | "COSMETIC",
  "category": "liability" | "payment" | "termination" | "IP" | "confidentiality" | "governing_law" | "term" | "warranty" | "other",
  "summary": "1-2 sentence plain-language description of substantive change",
  "whyItMatters": "Why this change is legally or commercially meaningful"
}`;

  try {
    const rawResult = await completeJson({
      messages: [
        {
          role: "system",
          content:
            "You are a contract legal redline classifier. Always respond with clean, valid JSON matching the requested schema.",
        },
        { role: "user", content: prompt },
      ],
      schema: classificationSchema,
      model: getAiModel(true),
      signal,
    });

    return applyGuardrails(rawResult, change, facts);
  } catch (err) {
    console.warn("LLM classification failed for clause, using deterministic fallback:", err.message);

    // Fallback: store UNREVIEWED with deterministic facts
    let fallbackSignificance = "UNREVIEWED";
    let fallbackCategory = "other";

    const headLower = (change.heading || "").toLowerCase();
    if (headLower.includes("liability") || headLower.includes("indemn")) fallbackCategory = "liability";
    else if (headLower.includes("pay") || headLower.includes("fee") || headLower.includes("invoice")) fallbackCategory = "payment";
    else if (headLower.includes("terminat")) fallbackCategory = "termination";
    else if (headLower.includes("intellectual") || headLower.includes("ip")) fallbackCategory = "IP";
    else if (headLower.includes("confidential")) fallbackCategory = "confidentiality";

    // If facts contain amount or duration, ensure at least MAJOR
    if (facts.some((f) => f.type === "amount" || f.type === "duration" || f.type === "percentage")) {
      fallbackSignificance = "MAJOR";
    }

    const factsSummary =
      facts.length > 0
        ? `Detected differences: ${facts.map((f) => `${f.before} -> ${f.after}`).join(", ")}.`
        : `Clause ${change.changeType.toLowerCase()} between versions.`;

    return {
      significance: fallbackSignificance,
      category: fallbackCategory,
      summary: factsSummary,
      whyItMatters: "Structured facts were identified by deterministic code. Manual review recommended.",
    };
  }
}

/**
 * Classifies an array of changes in parallel with bounded concurrency.
 *
 * @param {Array<object>} changesWithFacts
 * @param {number} [concurrency=4]
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<object>>}
 */
export async function classifyAllChanges(changesWithFacts, concurrency = 4, signal) {
  return runWithConcurrency(changesWithFacts, concurrency, async (item) => {
    const classification = await classifySingleChange(item, item.facts || [], signal);
    return {
      ...item,
      ...classification,
    };
  });
}

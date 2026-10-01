import { z } from "zod";
import { completeJson, getAiModel } from "@/lib/ai/client";
import { extractDistinctiveTerms } from "./search";

const expansionSchema = z.object({
  keywords: z.array(z.string()).min(1).max(12),
});

/**
 * Common legal synonyms for rule-based fallback
 */
const LEGAL_SYNONYMS = {
  termination: ["terminate", "cancellation", "expiry", "expiration", "notice", "breach", "convenience"],
  indemnity: ["indemnification", "hold harmless", "defend", "liability", "damages", "losses"],
  confidentiality: ["confidential", "non-disclosure", "nda", "proprietary", "trade secret"],
  payment: ["fee", "price", "invoice", "compensation", "remuneration", "due date", "billing"],
  noncompete: ["non-compete", "covenant not to compete", "restrictive covenant", "solicitation", "non-solicit"],
  governing: ["governing law", "jurisdiction", "venue", "dispute resolution", "arbitration", "courts"],
  warranty: ["warranties", "representation", "as is", "merchantability", "fitness"],
  liability: ["limitation of liability", "cap", "aggregate liability", "indirect damages", "consequential"],
  assignment: ["assign", "transfer", "change of control", "subcontract", "delegation"],
  term: ["effective date", "duration", "renewal", "extension", "commencement"],
};

/**
 * Generates rule-based expansion terms using keyword extraction and legal synonym dictionary.
 * @param {string} question
 * @returns {string[]}
 */
export function expandQueryRuleBased(question = "") {
  const terms = extractDistinctiveTerms(question);
  const expanded = new Set(terms);

  for (const term of terms) {
    const lower = term.toLowerCase();
    for (const [key, synonyms] of Object.entries(LEGAL_SYNONYMS)) {
      // Direct match or stem prefix match (e.g. "terminate" and "termination")
      const termStem = lower.slice(0, 5);
      const keyStem = key.slice(0, 5);

      if (
        lower.includes(key) ||
        key.includes(lower) ||
        termStem === keyStem ||
        synonyms.some((s) => s.includes(lower) || lower.includes(s))
      ) {
        for (const syn of synonyms) {
          expanded.add(syn);
        }
      }
    }
  }

  return [...expanded].slice(0, 20);
}

/**
 * Expands user query into 5-10 legal keywords and synonyms using the fast model,
 * falling back to dictionary rule-based expansion on failure.
 *
 * @param {string} question
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<string[]>}
 */
export async function expandQuery(question, options = {}) {
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return [];
  }

  const prompt = `You are a legal research assistant. Given this question about a contract, generate 5 to 10 relevant keywords, synonyms, and related legal phrases to locate the relevant clauses in the contract.
Respond with JSON matching: {"keywords": ["string"]}.

Question: "${question}"`;

  try {
    const result = await completeJson({
      messages: [
        {
          role: "system",
          content: "You generate targeted legal search keywords and synonyms in JSON format.",
        },
        { role: "user", content: prompt },
      ],
      schema: expansionSchema,
      model: getAiModel(true),
      signal: options.signal,
      temperature: 0.1,
    });

    if (result?.keywords && Array.isArray(result.keywords) && result.keywords.length > 0) {
      // Dedupe and sanitize
      const cleaned = result.keywords
        .map((k) => k.trim())
        .filter((k) => k.length >= 2);
      return [...new Set(cleaned)].slice(0, 10);
    }
  } catch (aiErr) {
    // Graceful fallback to rule-based expansion
  }

  return expandQueryRuleBased(question);
}

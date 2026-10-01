import { z } from "zod";
import { db } from "@/lib/db";
import { getContextBudget } from "@/lib/ai/budget";
import { completeJson, getAiModel } from "@/lib/ai/client";
import { retrieveAndPackChunks, mergePageRanges } from "./pack";
import { createCoverageObject } from "./coverage";

export const STRATEGY_MODES = {
  WHOLE: "whole",
  RETRIEVAL: "retrieval",
  EXHAUSTIVE: "exhaustive",
};

const mapExtractSchema = z.object({
  relevant: z.boolean(),
  extracts: z.array(z.string()).default([]),
});

/**
 * Bounded concurrency worker pool
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
 * Classifies the retrieval strategy for a question and document:
 * 1. WHOLE if document fits within context budget.
 * 2. EXHAUSTIVE for existence, absence, "list all", "summarise", "any", "every", "all".
 * 3. RETRIEVAL for targeted pinpoint questions.
 * 4. Fallback to EXHAUSTIVE when unsure.
 *
 * @param {string} question
 * @param {object} document
 * @param {number} [budget]
 * @returns {Promise<'whole'|'retrieval'|'exhaustive'>}
 */
export async function classifyStrategy(question = "", document = {}, budget) {
  const maxBudget = budget || getContextBudget();
  const charCount = document.charCount || (document.fullText || "").length || 0;

  // 1. If document completely fits within context budget, read all of it
  if (charCount > 0 && charCount <= maxBudget) {
    return STRATEGY_MODES.WHOLE;
  }

  const clean = question.trim().toLowerCase();

  // 2. Rule-based check: Existence / Absence patterns
  const existenceAbsenceRegex =
    /\b(is there|are there|does (it|the contract|this agreement|the agreement) mention|does (it|the contract|this agreement|the agreement) contain|does (it|the contract) have|any|every|anywhere|nowhere|absent|absence|silent on|missing|none|ever|neither party|prohibited|permitted)\b/i;

  // Rule-based check: Aggregation / Summary patterns
  const aggregationRegex =
    /\b(list all|find all|what are all|give all|summarise|summarize|overview|all clauses|all obligations|entire agreement|whole contract|everything|comprehensive)\b/i;

  if (existenceAbsenceRegex.test(clean) || aggregationRegex.test(clean)) {
    return STRATEGY_MODES.EXHAUSTIVE;
  }

  // 3. Rule-based check: Targeted clause questions
  const targetedClauseRegex =
    /\b(in (clause|section|article|schedule|exhibit)\s+[0-9a-z.]+|what is the payment term|when is the effective date|what is the governing law|who are the parties|what is the definition of)\b/i;

  if (targetedClauseRegex.test(clean)) {
    return STRATEGY_MODES.RETRIEVAL;
  }

  // 4. Fast model classifier fallback
  try {
    const classificationSchema = z.object({
      strategy: z.enum(["retrieval", "exhaustive"]),
    });

    const res = await completeJson({
      messages: [
        {
          role: "system",
          content: `Classify whether answering this contract question requires scanning the entire contract (exhaustive) or finding a specific targeted section (retrieval).
Use 'exhaustive' for questions about whether something is mentioned/absent, lists of all instances, or broad summaries.
Use 'retrieval' for questions asking about a specific known clause, defined term, or targeted fact.
When unsure, choose 'exhaustive'.
Return JSON: {"strategy": "retrieval" | "exhaustive"}`,
        },
        { role: "user", content: `Question: "${question}"` },
      ],
      schema: classificationSchema,
      model: getAiModel(true),
    });

    if (res?.strategy === "retrieval") {
      return STRATEGY_MODES.RETRIEVAL;
    }
    return STRATEGY_MODES.EXHAUSTIVE;
  } catch (err) {
    // When unsure, default to exhaustive
    return STRATEGY_MODES.EXHAUSTIVE;
  }
}

/**
 * Executes the determined strategy across the document:
 * - WHOLE: delivers all chunks, complete = true
 * - RETRIEVAL: delivers top-k chunks, complete = false
 * - EXHAUSTIVE: maps across all chunks with bounded concurrency (4), reduces relevant extracts
 *
 * @param {object} params
 * @param {object} params.document
 * @param {string} params.question
 * @param {string} [params.forcedMode]
 * @param {number} [params.budget]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{
 *   mode: 'whole'|'retrieval'|'exhaustive',
 *   contextText: string,
 *   chunks: Array<object>,
 *   coverage: object
 * }>}
 */
export async function executeStrategy({
  document,
  question,
  forcedMode,
  budget,
  signal,
}) {
  const maxBudget = budget || getContextBudget();
  const documentId = document.id;

  // Determine mode
  const mode =
    forcedMode ||
    (await classifyStrategy(question, document, maxBudget));

  const totalPages = document.pageCount || 1;
  const emptyPages = Array.isArray(document.emptyPages) ? document.emptyPages : [];

  // ==========================================
  // MODE 1: WHOLE
  // ==========================================
  if (mode === STRATEGY_MODES.WHOLE) {
    const allChunks = await db.chunk.findMany({
      where: { documentId },
      orderBy: { ordinal: "asc" },
    });

    const contextText = allChunks
      .map(
        (c) =>
          `[Section ${c.ordinal + 1}: ${c.heading || "Clause"} | Pages ${c.pageStart}-${c.pageEnd}]\n${c.text}`
      )
      .join("\n\n---\n\n");

    const pagesRead = [[1, totalPages]];
    const coverage = createCoverageObject({
      mode: STRATEGY_MODES.WHOLE,
      totalChunks: allChunks.length,
      chunksRead: allChunks.length,
      pagesRead,
      totalPages,
      emptyPages,
    });

    return {
      mode: STRATEGY_MODES.WHOLE,
      contextText,
      chunks: allChunks,
      coverage,
    };
  }

  // ==========================================
  // MODE 2: RETRIEVAL
  // ==========================================
  if (mode === STRATEGY_MODES.RETRIEVAL) {
    const totalChunksCount = await db.chunk.count({ where: { documentId } });

    const retrievalResult = await retrieveAndPackChunks({
      documentId,
      question,
      budget: maxBudget,
      signal,
    });

    const contextText = retrievalResult.chunks
      .map(
        (c) =>
          `[Section ${c.ordinal + 1}: ${c.heading || "Clause"} | Pages ${c.pageStart}-${c.pageEnd}]\n${c.text}`
      )
      .join("\n\n---\n\n");

    const coverage = createCoverageObject({
      mode: STRATEGY_MODES.RETRIEVAL,
      totalChunks: totalChunksCount,
      chunksRead: retrievalResult.chunksRead,
      pagesRead: retrievalResult.pagesRead,
      totalPages,
      emptyPages,
    });

    return {
      mode: STRATEGY_MODES.RETRIEVAL,
      contextText,
      chunks: retrievalResult.chunks,
      coverage,
    };
  }

  // ==========================================
  // MODE 3: EXHAUSTIVE (Map-Reduce over ALL chunks)
  // ==========================================
  const allChunks = await db.chunk.findMany({
    where: { documentId },
    orderBy: { ordinal: "asc" },
  });

  const totalChunks = allChunks.length;
  const failedChunks = [];
  const mapResults = [];

  // Concurrency bounded to 4
  const MAP_CONCURRENCY = 4;

  const mapChunk = async (chunk) => {
    if (signal?.aborted) return null;

    const chunkPrompt = `Question: "${question}"
Clause: ${chunk.heading || "Section " + (chunk.ordinal + 1)}
Text:
${chunk.text}

Does this text contain anything directly relevant to the question?
If yes, extract 1 to 3 exact verbatim passages.
Respond with JSON: {"relevant": boolean, "extracts": ["verbatim quote"]}`;

    const executeMap = async () => {
      return completeJson({
        messages: [
          {
            role: "system",
            content: "You extract exact verbatim contract clauses relevant to a question in JSON format.",
          },
          { role: "user", content: chunkPrompt },
        ],
        schema: mapExtractSchema,
        model: getAiModel(true),
        signal,
        temperature: 0.1,
      });
    };

    try {
      return await executeMap();
    } catch (firstErr) {
      // One retry per chunk on failure
      try {
        return await executeMap();
      } catch (retryErr) {
        failedChunks.push(chunk.id);
        return { relevant: false, extracts: [] };
      }
    }
  };

  const rawMapOutputs = await runWithConcurrency(
    allChunks,
    MAP_CONCURRENCY,
    mapChunk
  );

  const relevantExtracts = [];
  const relevantChunks = [];

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const mapOutput = rawMapOutputs[i];

    if (mapOutput?.relevant) {
      relevantChunks.push(chunk);
      if (Array.isArray(mapOutput.extracts) && mapOutput.extracts.length > 0) {
        for (const ext of mapOutput.extracts) {
          relevantExtracts.push({
            heading: chunk.heading,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd,
            extract: ext,
          });
        }
      } else {
        // Fallback to chunk text
        relevantExtracts.push({
          heading: chunk.heading,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
          extract: chunk.text.slice(0, 1000),
        });
      }
    }
  }

  // Reduce step: Build final context text
  let contextText = "";
  if (relevantExtracts.length > 0) {
    contextText = relevantExtracts
      .map(
        (e) =>
          `[Relevant Extract from ${e.heading || "Clause"} | Pages ${e.pageStart}-${e.pageEnd}]\n"${e.extract}"`
      )
      .join("\n\n---\n\n");
  } else {
    contextText = "No relevant provisions found across all analyzed sections.";
  }

  const allPageRanges = allChunks.map((c) => [c.pageStart, c.pageEnd]);
  const pagesRead = mergePageRanges(allPageRanges);

  const coverage = createCoverageObject({
    mode: STRATEGY_MODES.EXHAUSTIVE,
    totalChunks,
    chunksRead: totalChunks - failedChunks.length,
    pagesRead,
    totalPages,
    failedChunks,
    emptyPages,
  });

  return {
    mode: STRATEGY_MODES.EXHAUSTIVE,
    contextText,
    chunks: relevantChunks.length > 0 ? relevantChunks : allChunks.slice(0, 3),
    coverage,
  };
}

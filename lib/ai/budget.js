export const DEFAULT_MAX_CONTEXT_CHARS = 60000;

/**
 * Estimates token count from text length or char count (chars / 4).
 * @param {string|number} input
 * @returns {number}
 */
export function estimateTokens(input = "") {
  if (!input) return 0;
  const chars = typeof input === "number" ? input : input.length;
  return Math.ceil(chars / 4);
}

/**
 * Returns current context character budget from environment or default.
 * @returns {number}
 */
export function getContextBudget() {
  const envVal = process.env.AI_MAX_CONTEXT_CHARS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MAX_CONTEXT_CHARS;
}

/**
 * Groups chunks into sequential batches within a character budget.
 */
export function batchChunks(
  chunks = [],
  maxChars = DEFAULT_MAX_CONTEXT_CHARS,
  promptOverheadChars = 1500
) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const effectiveBudget = Math.max(1000, maxChars - promptOverheadChars);
  const batches = [];
  let currentBatch = [];
  let currentBatchChars = 0;

  for (const chunk of chunks) {
    const chunkChars = (chunk.text || "").length;

    if (
      currentBatch.length > 0 &&
      currentBatchChars + chunkChars > effectiveBudget
    ) {
      batches.push(currentBatch);
      currentBatch = [chunk];
      currentBatchChars = chunkChars;
    } else {
      currentBatch.push(chunk);
      currentBatchChars += chunkChars;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

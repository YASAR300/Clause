export const DEFAULT_MAX_CONTEXT_CHARS = 12000;

export function estimateTokens(text = "") {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

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

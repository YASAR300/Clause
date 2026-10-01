import { searchChunks } from "./search";
import { expandQuery } from "./expand";
import { getContextBudget } from "@/lib/ai/budget";

/**
 * Merges overlapping or consecutive page ranges into compact intervals.
 * E.g., [[1, 3], [3, 5], [10, 12]] => [[1, 5], [10, 12]]
 * @param {Array<[number, number]>} ranges
 * @returns {Array<[number, number]>}
 */
export function mergePageRanges(ranges = []) {
  if (!Array.isArray(ranges) || ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  let current = [...sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next[0] <= current[1] + 1) {
      current[1] = Math.max(current[1], next[1]);
    } else {
      merged.push(current);
      current = [...next];
    }
  }
  merged.push(current);
  return merged;
}

/**
 * Retrieves, merges, dedupes, and packs chunks within the character context budget,
 * strictly keeping document order (ordinal ascending).
 *
 * @param {object} params
 * @param {string} params.documentId
 * @param {string} params.question
 * @param {number} [params.budget]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{
 *   chunks: Array<object>,
 *   chunksRead: number,
 *   pagesRead: Array<[number, number]>,
 *   queryTerms: string[]
 * }>}
 */
export async function retrieveAndPackChunks({
  documentId,
  question,
  budget,
  signal,
}) {
  const maxBudget = budget || getContextBudget();
  const chunkMap = new Map();

  // 1. Search original question
  const initialMatches = await searchChunks({
    documentId,
    query: question,
    limit: 15,
  });

  for (const c of initialMatches) {
    chunkMap.set(c.id, c);
  }

  // 2. Expand query for legal synonyms
  const queryTerms = await expandQuery(question, { signal });

  // 3. Search across top expanded terms
  const searchPromises = queryTerms.slice(0, 5).map((term) =>
    searchChunks({
      documentId,
      query: term,
      limit: 6,
    })
  );

  const termMatchArrays = await Promise.all(searchPromises);
  for (const termMatches of termMatchArrays) {
    for (const c of termMatches) {
      if (!chunkMap.has(c.id)) {
        chunkMap.set(c.id, c);
      } else {
        // Boost score if found across multiple queries
        const existing = chunkMap.get(c.id);
        existing.rank = Math.max(existing.rank, c.rank) + 0.5;
      }
    }
  }

  // 4. Sort candidates by relevance score
  const candidates = Array.from(chunkMap.values());
  candidates.sort((a, b) => (b.rank || 0) - (a.rank || 0));

  // 5. Select top candidates that fit the context budget
  let accumulatedChars = 0;
  const selected = [];

  for (const candidate of candidates) {
    const chunkChars = (candidate.text || "").length;
    if (accumulatedChars + chunkChars <= maxBudget || selected.length === 0) {
      selected.push(candidate);
      accumulatedChars += chunkChars;
    }
  }

  // 6. Sort selected chunks by original document order (ordinal ASC)
  selected.sort((a, b) => a.ordinal - b.ordinal);

  // 7. Calculate contiguous page ranges
  const rawPageRanges = selected.map((c) => [c.pageStart, c.pageEnd]);
  const pagesRead = mergePageRanges(rawPageRanges);

  return {
    chunks: selected,
    chunksRead: selected.length,
    pagesRead,
    queryTerms,
  };
}

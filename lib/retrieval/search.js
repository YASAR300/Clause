import { db } from "@/lib/db";

const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "are", "what", "which",
  "who", "whom", "will", "shall", "does", "have", "been", "were", "where",
  "when", "how", "there", "any", "all", "each", "every", "some", "such",
  "under", "over", "into", "onto", "about", "above", "below", "between",
  "can", "could", "would", "should", "either", "neither", "both"
]);

/**
 * Extracts distinctive search terms from a query string for ILIKE fallback.
 * @param {string} query
 * @returns {string[]}
 */
export function extractDistinctiveTerms(query = "") {
  if (!query || typeof query !== "string") return [];
  const words = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return [...new Set(words)];
}

/**
 * Searches chunks within a document using PostgreSQL Full Text Search (websearch_to_tsquery + ts_rank_cd)
 * with graceful ILIKE fallback on distinctive terms when FTS returns no matches.
 *
 * @param {object} params
 * @param {string} params.documentId
 * @param {string} params.query
 * @param {number} [params.limit=10]
 * @returns {Promise<Array<object>>}
 */
export async function searchChunks({ documentId, query, limit = 10 }) {
  if (!documentId || !query || query.trim().length === 0) {
    return [];
  }

  const cleanQuery = query.trim();

  // 1. Try PostgreSQL full-text search with websearch_to_tsquery and ts_rank_cd
  try {
    const ftsResults = await db.$queryRaw`
      SELECT
        "id",
        "documentId",
        "ordinal",
        "text",
        "startOffset",
        "endOffset",
        "pageStart",
        "pageEnd",
        "heading",
        ts_rank_cd("tsv", websearch_to_tsquery('english', ${cleanQuery})) as "rank"
      FROM "Chunk"
      WHERE "documentId" = ${documentId}
        AND "tsv" @@ websearch_to_tsquery('english', ${cleanQuery})
      ORDER BY "rank" DESC, "ordinal" ASC
      LIMIT ${limit}
    `;

    if (Array.isArray(ftsResults) && ftsResults.length > 0) {
      return ftsResults.map((r) => ({
        id: r.id,
        documentId: r.documentId,
        ordinal: r.ordinal,
        text: r.text,
        startOffset: r.startOffset,
        endOffset: r.endOffset,
        pageStart: r.pageStart,
        pageEnd: r.pageEnd,
        heading: r.heading,
        rank: parseFloat(r.rank) || 0,
        matchType: "fts",
      }));
    }
  } catch (ftsError) {
    // If tsquery encounters an unsupported operator or tsv isn't populated yet, continue to ILIKE fallback
  }

  // 2. Fallback to ILIKE on distinctive terms
  const terms = extractDistinctiveTerms(cleanQuery);
  if (terms.length === 0) {
    return [];
  }

  try {
    // Search with Prisma OR conditions for distinctive terms
    const orConditions = [];
    for (const term of terms) {
      orConditions.push({ text: { contains: term, mode: "insensitive" } });
      orConditions.push({ heading: { contains: term, mode: "insensitive" } });
    }

    const ilikeResults = await db.chunk.findMany({
      where: {
        documentId,
        OR: orConditions,
      },
      take: limit * 2,
    });

    if (!ilikeResults || ilikeResults.length === 0) {
      return [];
    }

    // Rank by term occurrence density
    const scored = ilikeResults.map((chunk) => {
      let score = 0;
      const combined = `${chunk.heading || ""} ${chunk.text}`.toLowerCase();
      for (const term of terms) {
        if (combined.includes(term)) {
          score += 1;
        }
      }
      return {
        ...chunk,
        rank: score,
        matchType: "ilike",
      };
    });

    scored.sort((a, b) => b.rank - a.rank || a.ordinal - b.ordinal);
    return scored.slice(0, limit);
  } catch (ilikeError) {
    return [];
  }
}

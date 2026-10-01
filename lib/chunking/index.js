/**
 * Contract-aware chunking engine.
 * Splits legal contracts on clause headings, paragraph breaks, and sentence boundaries
 * while maintaining strict character offset invariants and page mapping.
 */

export const TARGET_CHUNK_CHARS = 3500;
export const MAX_CHUNK_CHARS = 5000;
export const OVERLAP_CHARS = 300;

/**
 * Extracts a structured heading from a single line of text if present.
 * Detects:
 * - Numbered headings ("1.", "1.1", "12.3", "12.3.4")
 * - Article / Section / Clause / Schedule / Exhibit / Appendix
 * - ALL-CAPS lines (e.g. "INDEMNIFICATION AND LIABILITY")
 *
 * @param {string} line
 * @returns {string|null}
 */
export function extractHeading(line) {
  if (!line || typeof line !== "string") return null;
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 120) return null;

  // 1. Article / Section / Clause / Schedule / Exhibit / Appendix / Annex / Attachment
  const keywordMatch = trimmed.match(
    /^(?:ARTICLE|SECTION|CLAUSE|SCHEDULE|EXHIBIT|APPENDIX|ATTACHMENT|ANNEX)\s+([0-9IVXLCDM]+|[A-Z])(?:\.[0-9]+)*[.:\s\-\u2013\u2014]*(.*)$/i
  );
  if (keywordMatch) return trimmed;

  // 2. Numbered clause: "1. Definitions", "12.3 Indemnification", "4.1 Payment Terms"
  const numberedMatch = trimmed.match(
    /^[0-9]{1,3}(?:\.[0-9]{1,3}){0,3}\.?\s+([A-Za-z][^\n]*)$/
  );
  if (numberedMatch) return trimmed;

  // 3. ALL CAPS heading: "TERMINATION AND DEFAULT", "GOVERNING LAW"
  if (/^[A-Z][A-Z0-9\s,:\-–—]{3,80}$/.test(trimmed)) {
    const letters = trimmed.match(/[A-Z]/g) || [];
    if (letters.length >= 3 && !trimmed.endsWith(".")) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Binary search for page number containing the given character offset.
 *
 * @param {Array<{pageNumber: number, startOffset: number, endOffset: number}>} pages
 * @param {number} offset
 * @returns {number}
 */
export function findPageForOffset(pages, offset) {
  if (!Array.isArray(pages) || pages.length === 0) return 1;
  if (offset <= 0) return pages[0].pageNumber;

  let low = 0;
  let high = pages.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const page = pages[mid];

    if (offset >= page.startOffset && offset < page.endOffset) {
      return page.pageNumber;
    }
    if (offset < page.startOffset) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  if (low >= pages.length) return pages[pages.length - 1].pageNumber;
  return pages[Math.max(0, high)].pageNumber;
}

/**
 * Finds the best split point before maxOffset, prioritizing:
 * 1. Paragraph breaks (\n\n)
 * 2. Line breaks (\n)
 * 3. Sentence ends (. / ! / ?)
 * 4. Space / word boundaries
 */
function findSplitOffset(text, startOffset, targetOffset, maxOffset) {
  const windowEnd = Math.min(text.length, maxOffset);
  const searchStart = Math.max(startOffset + 100, targetOffset - 500);

  // 1. Look for paragraph break (\n\n) between searchStart and windowEnd
  const paraIdx = text.lastIndexOf("\n\n", windowEnd);
  if (paraIdx >= searchStart) {
    return paraIdx + 2;
  }

  // 2. Look for single newline (\n)
  const lineIdx = text.lastIndexOf("\n", windowEnd);
  if (lineIdx >= searchStart) {
    return lineIdx + 1;
  }

  // 3. Look for sentence boundary (. / ! / ? followed by space)
  const slice = text.slice(searchStart, windowEnd);
  const sentenceMatch = [...slice.matchAll(/[.!?]\s+/g)];
  if (sentenceMatch.length > 0) {
    const lastMatch = sentenceMatch[sentenceMatch.length - 1];
    return searchStart + lastMatch.index + lastMatch[0].length;
  }

  // 4. Look for word boundary (space)
  const spaceIdx = text.lastIndexOf(" ", windowEnd);
  if (spaceIdx >= searchStart) {
    return spaceIdx + 1;
  }

  return windowEnd;
}

/**
 * Splits contract fullText into chunks with page ranges, headings, and character offsets.
 *
 * Invariant guaranteed:
 * fullText.slice(chunk.startOffset, chunk.endOffset) === chunk.text
 *
 * @param {string} fullText
 * @param {Array<{pageNumber: number, startOffset: number, endOffset: number}>} pages
 * @param {string} [documentId]
 * @param {object} [options]
 * @returns {Array<object>}
 */
export function chunkContract(fullText, pages = [], documentId = null, options = {}) {
  if (!fullText || typeof fullText !== "string" || fullText.trim().length === 0) {
    return [];
  }

  const targetChars = options.targetChars || TARGET_CHUNK_CHARS;
  const maxChars = options.maxChars || MAX_CHUNK_CHARS;
  const overlapChars = options.overlapChars || OVERLAP_CHARS;

  // 1. Scan fullText for line-by-line heading positions
  const headingPoints = [];
  const lines = fullText.split("\n");
  let currentOffset = 0;

  for (const line of lines) {
    const heading = extractHeading(line);
    if (heading) {
      headingPoints.push({
        offset: currentOffset,
        heading,
      });
    }
    currentOffset += line.length + 1; // +1 for the newline
  }

  // Helper to find nearest preceding heading for an offset
  const getNearestHeading = (offset) => {
    let nearest = null;
    for (const hp of headingPoints) {
      if (hp.offset <= offset) {
        nearest = hp.heading;
      } else {
        break;
      }
    }
    return nearest;
  };

  const rawChunks = [];
  let chunkStart = 0;
  const textLength = fullText.length;

  while (chunkStart < textLength) {
    const remaining = textLength - chunkStart;
    if (remaining <= maxChars) {
      // Last chunk fits cleanly
      rawChunks.push({
        startOffset: chunkStart,
        endOffset: textLength,
        isMidClauseSplit: false,
      });
      break;
    }

    // Determine target and max candidate ends
    const candidateTarget = chunkStart + targetChars;
    const candidateMax = chunkStart + maxChars;

    // Check if there is a heading starting between chunkStart + 1000 and candidateMax
    let splitAtHeading = null;
    for (const hp of headingPoints) {
      if (hp.offset >= chunkStart + 1000 && hp.offset <= candidateMax) {
        // Prefer heading closest to candidateTarget
        if (!splitAtHeading || Math.abs(hp.offset - candidateTarget) < Math.abs(splitAtHeading.offset - candidateTarget)) {
          splitAtHeading = hp;
        }
      }
    }

    if (splitAtHeading) {
      // Split right at the start of the next heading (no overlap needed at natural clause boundary)
      rawChunks.push({
        startOffset: chunkStart,
        endOffset: splitAtHeading.offset,
        isMidClauseSplit: false,
      });
      chunkStart = splitAtHeading.offset;
    } else {
      // Split mid-clause at paragraph, sentence, or word boundary
      const splitOffset = findSplitOffset(fullText, chunkStart, candidateTarget, candidateMax);
      rawChunks.push({
        startOffset: chunkStart,
        endOffset: splitOffset,
        isMidClauseSplit: true,
      });

      // Apply overlap on mid-clause split
      const nextStart = Math.max(chunkStart + 1, splitOffset - overlapChars);
      chunkStart = nextStart;
    }
  }

  // 2. Map chunks to page numbers and add metadata
  return rawChunks.map((rc, idx) => {
    const textSlice = fullText.slice(rc.startOffset, rc.endOffset);
    const heading = getNearestHeading(rc.startOffset);
    const pageStart = findPageForOffset(pages, rc.startOffset);
    const pageEnd = findPageForOffset(pages, Math.max(rc.startOffset, rc.endOffset - 1));

    return {
      ...(documentId ? { documentId } : {}),
      ordinal: idx,
      text: textSlice,
      startOffset: rc.startOffset,
      endOffset: rc.endOffset,
      pageStart,
      pageEnd,
      heading,
    };
  });
}

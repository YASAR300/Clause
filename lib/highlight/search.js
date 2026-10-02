import { collectTextNodes, mapOffsetToNode } from "./dom";
import { getHighlightRects } from "./overlay";
import { buildIndex, cleanSearchQuote, normalize } from "@/lib/verify/quotes";

/**
 * Searches the rendered DOM text for arbitrary user search strings using
 * the same normalization engine as citations.
 *
 * @param {HTMLElement} container
 * @param {string} query
 * @returns {Array<{
 *   index: number,
 *   range: Range,
 *   rects: Array<{ top: number, left: number, width: number, height: number }>,
 *   matchedText: string
 * }>}
 */
export function findInDom(container, query) {
  if (!container || !query || typeof query !== "string") {
    return [];
  }

  const cleaned = cleanSearchQuote(query);
  const normalizedQuery = normalize(cleaned);

  if (normalizedQuery.length === 0) {
    return [];
  }

  const { textNodes, fullText } = collectTextNodes(container);
  if (!textNodes.length || !fullText) {
    return [];
  }

  const { normalized: domNorm, map: domMap } = buildIndex(fullText);
  if (!domNorm) {
    return [];
  }

  const results = [];
  let pos = 0;
  let matchIndex = 0;

  while (pos <= domNorm.length - normalizedQuery.length) {
    const idx = domNorm.indexOf(normalizedQuery, pos);
    if (idx === -1) break;

    const rawStart = domMap[idx];
    const rawEnd = domMap[idx + normalizedQuery.length - 1] + 1;

    const startLoc = mapOffsetToNode(textNodes, rawStart, false);
    const endLoc = mapOffsetToNode(textNodes, rawEnd, true);

    if (startLoc && endLoc) {
      try {
        const range = document.createRange();
        range.setStart(startLoc.node, startLoc.offset);
        range.setEnd(endLoc.node, endLoc.offset);

        const rects = getHighlightRects(range, container);

        results.push({
          index: matchIndex,
          range,
          rects,
          rawStart,
          rawEnd,
          matchedText: fullText.slice(rawStart, rawEnd),
        });

        matchIndex++;
      } catch {
        // Ignore range creation error
      }
    }

    pos = idx + 1;
  }

  return results;
}

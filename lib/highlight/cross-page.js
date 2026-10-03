import { collectTextNodes, mapOffsetToNode } from "./dom";
import { getHighlightRects } from "./overlay";
import { buildIndex, cleanSearchQuote, normalize } from "@/lib/verify/quotes";

/**
 * Handles quotes that cross page breaks (e.g. spanning from bottom of page 12 to top of page 13).
 * Collects text across all candidate pages, joins consecutive page texts with a single space,
 * produces highlight segments on each page, and identifies the first page to scroll to.
 *
 * @param {Array<{ pageNumber: number, container: HTMLElement }>} pages
 * @param {string} quote
 * @returns {{
 *   matchFound: boolean,
 *   firstPage: number|null,
 *   pageHighlights: Map<number, Array<{ top: number, left: number, width: number, height: number }>>,
 *   ranges: Range[]
 * }}
 */
export function locateCrossPageInDom(pages, quote) {
  if (!pages?.length || !quote) {
    return { matchFound: false, firstPage: null, pageHighlights: new Map(), ranges: [] };
  }

  // Sort pages in ascending page order
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  const allTextNodes = [];
  let combinedFullText = "";
  let currentOffset = 0;

  // Track page boundaries within the combined text
  const pageBoundaries = [];

  sortedPages.forEach((pageItem, pIdx) => {
    const { pageNumber, container } = pageItem;
    if (!container) return;

    const pageStartOffset = currentOffset;
    const { textNodes, fullText } = collectTextNodes(container);

    for (const tNode of textNodes) {
      allTextNodes.push({
        node: tNode.node,
        start: currentOffset + tNode.start,
        end: currentOffset + tNode.end,
        pageNumber,
        container,
      });
    }

    currentOffset += fullText.length;
    const pageEndOffset = currentOffset;

    pageBoundaries.push({
      pageNumber,
      container,
      pageContainerEl: pageItem.pageContainerEl || null,
      startOffset: pageStartOffset,
      endOffset: pageEndOffset,
    });

    combinedFullText += fullText;

    // Join consecutive pages with a single space to allow natural cross-page quote matching
    if (pIdx < sortedPages.length - 1) {
      combinedFullText += " ";
      currentOffset += 1;
    }
  });

  if (!combinedFullText || !allTextNodes.length) {
    return { matchFound: false, firstPage: null, pageHighlights: new Map(), ranges: [] };
  }

  const cleanedQuote = cleanSearchQuote(quote);
  const normalizedQuote = normalize(cleanedQuote);

  if (normalizedQuote.length < 4) {
    return { matchFound: false, firstPage: null, pageHighlights: new Map(), ranges: [] };
  }

  const { normalized: combinedNorm, map: combinedMap } = buildIndex(combinedFullText);
  if (!combinedNorm) {
    return { matchFound: false, firstPage: null, pageHighlights: new Map(), ranges: [] };
  }

  // Find quote in combined normalized text
  let matchIdx = combinedNorm.indexOf(normalizedQuote);
  let targetLen = normalizedQuote.length;

  // Fallback: match with all whitespace removed
  if (matchIdx === -1) {
    const noSpaceQuote = normalizedQuote.replace(/\s+/g, "");
    if (noSpaceQuote.length >= 4) {
      const noSpaceChars = [];
      const noSpaceMap = [];

      for (let i = 0; i < combinedNorm.length; i++) {
        if (combinedNorm[i] !== " ") {
          noSpaceChars.push(combinedNorm[i]);
          noSpaceMap.push(combinedMap[i]);
        }
      }

      const noSpaceText = noSpaceChars.join("");
      const noSpaceIdx = noSpaceText.indexOf(noSpaceQuote);
      if (noSpaceIdx !== -1) {
        const rawStart = noSpaceMap[noSpaceIdx];
        const rawEnd = noSpaceMap[noSpaceIdx + noSpaceQuote.length - 1] + 1;
        return splitMatchAcrossPages(rawStart, rawEnd, allTextNodes, pageBoundaries);
      }
    }

    return { matchFound: false, firstPage: null, pageHighlights: new Map(), ranges: [] };
  }

  const rawStart = combinedMap[matchIdx];
  const rawEnd = combinedMap[matchIdx + targetLen - 1] + 1;

  return splitMatchAcrossPages(rawStart, rawEnd, allTextNodes, pageBoundaries);
}

/**
 * Splits a match span across individual pages and creates page-relative highlight rects.
 */
function splitMatchAcrossPages(rawStart, rawEnd, allTextNodes, pageBoundaries) {
  const pageHighlights = new Map();
  const ranges = [];
  let firstPage = null;

  for (const boundary of pageBoundaries) {
    const { pageNumber, container, pageContainerEl, startOffset, endOffset } = boundary;

    // Check if this page overlaps with [rawStart, rawEnd]
    const segmentStart = Math.max(rawStart, startOffset);
    const segmentEnd = Math.min(rawEnd, endOffset);

    if (segmentStart < segmentEnd) {
      if (firstPage === null) {
        firstPage = pageNumber;
      }

      // Filter text nodes belonging to this page
      const pageNodes = allTextNodes
        .filter((n) => n.pageNumber === pageNumber)
        .map((n) => ({
          node: n.node,
          start: n.start - startOffset,
          end: n.end - startOffset,
        }));

      const pageSegmentStart = segmentStart - startOffset;
      const pageSegmentEnd = segmentEnd - startOffset;

      const startLoc = mapOffsetToNode(pageNodes, pageSegmentStart, false);
      const endLoc = mapOffsetToNode(pageNodes, pageSegmentEnd, true);

      if (startLoc && endLoc) {
        try {
          const range = document.createRange();
          range.setStart(startLoc.node, startLoc.offset);
          range.setEnd(endLoc.node, endLoc.offset);
          ranges.push(range);

          // Use pageContainerEl as coordinate origin if provided; it matches the
          // HighlightOverlay's absolute positioning context (the outer page div).
          const coordOrigin = pageContainerEl || container;
          const rects = getHighlightRects(range, coordOrigin);
          if (rects.length > 0) {
            pageHighlights.set(pageNumber, rects);
          }
        } catch {
          // Ignore invalid range safely
        }
      }
    }
  }

  return {
    matchFound: pageHighlights.size > 0,
    firstPage,
    pageHighlights,
    ranges,
  };
}

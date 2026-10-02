import { buildIndex, cleanSearchQuote, normalize } from "@/lib/verify/quotes";

/**
 * Traverses a DOM container in document order and collects all non-empty text nodes
 * with their absolute character boundaries in the concatenated text stream.
 *
 * @param {Node} container
 * @returns {{ textNodes: Array<{ node: Text, start: number, end: number, text: string }>, fullText: string }}
 */
export function collectTextNodes(container) {
  if (!container) {
    return { textNodes: [], fullText: "" };
  }

  const textNodes = [];
  let fullText = "";
  let currentOffset = 0;

  // Use TreeWalker for high performance across large DOM trees
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.textContent || node.textContent.length === 0) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = node.parentElement;
        if (parent) {
          const tag = parent.tagName.toLowerCase();
          if (tag === "script" || tag === "style" || tag === "noscript") {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    const text = currentNode.textContent;
    const len = text.length;
    textNodes.push({
      node: currentNode,
      start: currentOffset,
      end: currentOffset + len,
      text,
    });
    fullText += text;
    currentOffset += len;
    currentNode = walker.nextNode();
  }

  return { textNodes, fullText };
}

/**
 * Maps a character offset in concatenated DOM text to the exact TextNode and node offset.
 *
 * @param {Array<{ node: Text, start: number, end: number }>} textNodes
 * @param {number} targetOffset
 * @param {boolean} [isEnd=false]
 * @returns {{ node: Text, offset: number }|null}
 */
export function mapOffsetToNode(textNodes, targetOffset, isEnd = false) {
  if (!textNodes.length) return null;

  if (targetOffset <= 0) {
    return { node: textNodes[0].node, offset: 0 };
  }

  const last = textNodes[textNodes.length - 1];
  if (targetOffset >= last.end) {
    return { node: last.node, offset: last.node.textContent.length };
  }

  // Binary search for efficiency on large pages
  let low = 0;
  let high = textNodes.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const item = textNodes[mid];

    if (isEnd) {
      if (targetOffset > item.start && targetOffset <= item.end) {
        return { node: item.node, offset: targetOffset - item.start };
      }
      if (targetOffset <= item.start) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    } else {
      if (targetOffset >= item.start && targetOffset < item.end) {
        return { node: item.node, offset: targetOffset - item.start };
      }
      if (targetOffset < item.start) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
  }

  // Fallback clamping
  return { node: last.node, offset: last.node.textContent.length };
}

/**
 * Locates all occurrences of a quote within a DOM container using verified normalization.
 * Matches strategy:
 * 1. Normalised exact substring match
 * 2. All-whitespace removed fallback match (pdf.js word-split spans)
 * 3. Ellipsis multi-fragment matching
 *
 * @param {HTMLElement} container
 * @param {string} quote
 * @param {object} [options]
 * @param {boolean} [options.findAll=true]
 * @param {number} [options.hintOffset]
 * @returns {Array<{
 *   range: Range,
 *   startOffset: number,
 *   endOffset: number,
 *   matchedText: string
 * }>}
 */
export function locateInDom(container, quote, options = {}) {
  if (!container || !quote || typeof quote !== "string") {
    return [];
  }

  const cleanedQuote = cleanSearchQuote(quote);
  const normalizedQuote = normalize(cleanedQuote);

  if (normalizedQuote.length < 4) {
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

  const rawMatches = [];

  // Check for ellipsis fragments
  const rawFragments = cleanedQuote
    .split(/\.{3,}|\u2026/)
    .map((f) => normalize(f))
    .filter((f) => f.length > 0);

  const fragments = rawFragments.length > 0 ? rawFragments : [normalizedQuote];

  if (fragments.length === 1) {
    const target = fragments[0];
    let pos = 0;

    while (pos <= domNorm.length - target.length) {
      const matchIdx = domNorm.indexOf(target, pos);
      if (matchIdx === -1) break;

      const rawStart = domMap[matchIdx];
      const rawEnd = domMap[matchIdx + target.length - 1] + 1;

      rawMatches.push({ rawStart, rawEnd });
      pos = matchIdx + 1;

      if (!options.findAll && rawMatches.length > 0 && options.hintOffset === undefined) {
        break;
      }
    }
  } else {
    // Multi-fragment matching with ellipsis (max 1200 chars gap)
    const firstFrag = fragments[0];
    let pos = 0;

    while (pos <= domNorm.length - firstFrag.length) {
      const firstIdx = domNorm.indexOf(firstFrag, pos);
      if (firstIdx === -1) break;

      let currentEnd = firstIdx + firstFrag.length;
      let allFound = true;
      let lastMatchEnd = currentEnd;

      for (let f = 1; f < fragments.length; f++) {
        const frag = fragments[f];
        const nextIdx = domNorm.indexOf(frag, currentEnd);
        if (nextIdx === -1 || nextIdx - currentEnd > 1200) {
          allFound = false;
          break;
        }
        currentEnd = nextIdx + frag.length;
        lastMatchEnd = currentEnd;
      }

      if (allFound) {
        const rawStart = domMap[firstIdx];
        const rawEnd = domMap[lastMatchEnd - 1] + 1;
        rawMatches.push({ rawStart, rawEnd });
      }

      pos = firstIdx + 1;
    }
  }

  // Fallback pass: match with all whitespace removed
  if (rawMatches.length === 0) {
    const noSpaceQuote = normalizedQuote.replace(/\s+/g, "");
    if (noSpaceQuote.length >= 4) {
      const noSpaceChars = [];
      const noSpaceMap = [];

      for (let i = 0; i < domNorm.length; i++) {
        if (domNorm[i] !== " ") {
          noSpaceChars.push(domNorm[i]);
          noSpaceMap.push(domMap[i]);
        }
      }

      const noSpaceDom = noSpaceChars.join("");
      let pos = 0;

      while (pos <= noSpaceDom.length - noSpaceQuote.length) {
        const matchIdx = noSpaceDom.indexOf(noSpaceQuote, pos);
        if (matchIdx === -1) break;

        const rawStart = noSpaceMap[matchIdx];
        const rawEnd = noSpaceMap[matchIdx + noSpaceQuote.length - 1] + 1;

        rawMatches.push({ rawStart, rawEnd });
        pos = matchIdx + 1;

        if (!options.findAll && rawMatches.length > 0) break;
      }
    }
  }

  // Convert rawMatches to DOM Range objects
  const results = [];

  for (const { rawStart, rawEnd } of rawMatches) {
    const startLoc = mapOffsetToNode(textNodes, rawStart, false);
    const endLoc = mapOffsetToNode(textNodes, rawEnd, true);

    if (!startLoc || !endLoc) continue;

    try {
      const range = document.createRange();
      range.setStart(startLoc.node, startLoc.offset);
      range.setEnd(endLoc.node, endLoc.offset);

      results.push({
        range,
        startOffset: rawStart,
        endOffset: rawEnd,
        matchedText: fullText.slice(rawStart, rawEnd),
      });
    } catch {
      // Ignore invalid ranges safely
    }
  }

  // Sort by proximity to hintOffset if provided
  if (options.hintOffset !== undefined && results.length > 1) {
    results.sort((a, b) => {
      const distA = Math.abs(a.startOffset - options.hintOffset);
      const distB = Math.abs(b.startOffset - options.hintOffset);
      return distA - distB;
    });
  }

  return results;
}

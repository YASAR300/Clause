import { findPageForOffset } from "../chunking/index.js";

const SOFT_HYPHENS_AND_ZERO_WIDTH = new Set([
  "\u00AD", // soft hyphen
  "\u200B", // zero-width space
  "\u200C", // zero-width non-joiner
  "\u200D", // zero-width joiner
  "\uFEFF", // zero-width no-break space / BOM
]);

const LIGATURE_MAP = {
  "\uFB00": "ff",
  "\uFB01": "fi",
  "\uFB02": "fl",
  "\uFB03": "ffi",
  "\uFB04": "ffl",
  "\uFB05": "ft",
  "\uFB06": "st",
  "\u00E6": "ae",
  "\u0153": "oe",
  "\u00C6": "ae",
  "\u0152": "oe",
};

const QUOTE_MAP = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201B": "'",
  "\u2032": "'",
  "\u2035": "'",
  "`": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u201F": '"',
  "\u00AB": '"',
  "\u00BB": '"',
  "\u2033": '"',
  "\u2036": '"',
};

const DASH_MAP = {
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2212": "-",
  "\uFE58": "-",
  "\uFE63": "-",
  "\uFF0D": "-",
};

function isWhitespaceChar(ch) {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\u00A0" || ch === "\f";
}

function isLetterChar(ch) {
  if (!ch) return false;
  return /\p{L}/u.test(ch);
}

/**
 * Builds a normalized version of text alongside an exact 1-to-1 character offset map.
 * map[i] returns the 0-indexed offset in the original text of normalized character i.
 *
 * Handles:
 * - Unicode NFKC
 * - Ligature expansion (fi, fl, ffi)
 * - Curly to straight quotes
 * - Dashes & minus to standard "-"
 * - Soft hyphens and zero-width characters removal
 * - Hyphenated words joined across line breaks ("indem-\nnity" -> "indemnity")
 * - Whitespace run collapsing to a single space
 * - Trimming leading/trailing whitespace
 * - Lowercase conversion
 *
 * @param {string} text
 * @returns {{ normalized: string, map: number[] }}
 */
export function buildIndex(text = "") {
  if (!text || typeof text !== "string") {
    return { normalized: "", map: [] };
  }

  // 1. Initial tokenization with character indices
  const tokens = [];
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i];
    if (SOFT_HYPHENS_AND_ZERO_WIDTH.has(ch)) {
      continue;
    }
    tokens.push({ char: ch, origIdx: i });
  }

  // 2. Join words hyphenated across line breaks: (\p{L})-\s*\r?\n\s*(\p{L})
  const hyphenJoined = [];
  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];

    if (
      curr.char === "-" &&
      i > 0 &&
      isLetterChar(tokens[i - 1].char)
    ) {
      // Lookahead: check if followed by optional whitespace + newline + optional whitespace + letter
      let lookahead = i + 1;
      let hasNewline = false;

      while (lookahead < tokens.length && isWhitespaceChar(tokens[lookahead].char)) {
        if (tokens[lookahead].char === "\n" || tokens[lookahead].char === "\r") {
          hasNewline = true;
        }
        lookahead++;
      }

      if (hasNewline && lookahead < tokens.length && isLetterChar(tokens[lookahead].char)) {
        // Hyphenated word across line break! Skip hyphen and whitespace up to the next letter
        i = lookahead - 1; // loop increment will move to lookahead
        continue;
      }
    }

    hyphenJoined.push(curr);
  }

  // 3. Ligature expansion, quote/dash canonicalization, NFKC, and whitespace collapsing
  const processed = [];
  let inWhitespace = false;

  for (let i = 0; i < hyphenJoined.length; i++) {
    const { char: rawChar, origIdx } = hyphenJoined[i];

    // Canonicalize dashes
    let ch = DASH_MAP[rawChar] || rawChar;
    // Canonicalize quotes
    ch = QUOTE_MAP[ch] || ch;
    // Canonicalize ligatures
    const ligatureExpanded = LIGATURE_MAP[ch];

    if (ligatureExpanded) {
      for (const expandedChar of ligatureExpanded) {
        processed.push({ char: expandedChar.toLowerCase(), origIdx });
      }
      inWhitespace = false;
      continue;
    }

    // NFKC normalization for single char
    const nfkc = ch.normalize("NFKC");
    if (isWhitespaceChar(ch) || isWhitespaceChar(nfkc)) {
      if (!inWhitespace) {
        processed.push({ char: " ", origIdx });
        inWhitespace = true;
      }
    } else {
      inWhitespace = false;
      for (const subChar of nfkc) {
        processed.push({ char: subChar.toLowerCase(), origIdx });
      }
    }
  }

  // 4. Trim leading and trailing whitespace while preserving exact offset mapping
  let startIdx = 0;
  while (startIdx < processed.length && processed[startIdx].char === " ") {
    startIdx++;
  }

  let endIdx = processed.length - 1;
  while (endIdx >= startIdx && processed[endIdx].char === " ") {
    endIdx--;
  }

  const trimmed = processed.slice(startIdx, endIdx + 1);

  const normalized = trimmed.map((t) => t.char).join("");
  const map = trimmed.map((t) => t.origIdx);

  return { normalized, map };
}

/**
 * Normalizes text per the specification rules.
 * @param {string} text
 * @returns {string}
 */
export function normalize(text = "") {
  return buildIndex(text).normalized;
}

/**
 * Strips surrounding quotes, parentheses, and ellipses from a search quote.
 * @param {string} quote
 * @returns {string}
 */
export function cleanSearchQuote(quote = "") {
  if (!quote || typeof quote !== "string") return "";
  let cleaned = quote.trim();

  // Strip leading and trailing quotes
  cleaned = cleaned.replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "").trim();

  // Strip leading and trailing ellipses
  cleaned = cleaned.replace(/^(?:\.{3,}|\u2026)+|(?:\.{3,}|\u2026)+$/g, "").trim();

  // Strip surrounding quotes again if they were inside ellipses
  cleaned = cleaned.replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "").trim();

  return cleaned;
}

/**
 * Locates all occurrences of a quote within documentText with character-level accuracy.
 *
 * Strict Rules:
 * - Minimum 8 normalized characters (else unverified "too short to verify")
 * - Handles ellipses (...) by splitting into ordered fragments within a bounded window
 * - Case-insensitive, line-break, whitespace, and hyphenation invariant
 * - Returns exact original start and end offsets mapped back from index
 * - Page numbers computed via binary search on page offsets
 * - If absent, checks otherDocuments for cross-document detection
 *
 * @param {string} documentText
 * @param {Array<{pageNumber: number, startOffset: number, endOffset: number}>} pages
 * @param {string} quote
 * @param {object} [options]
 * @param {Array<{id: string, name: string, fullText: string, pages: Array}>} [options.otherDocuments]
 * @returns {{
 *   verified: boolean,
 *   matchCount: number,
 *   matches: Array<{ start: number, end: number, pageStart: number, pageEnd: number, loose?: boolean }>,
 *   reason: string|null
 * }}
 */
export function findQuote(documentText, pages = [], quote = "", options = {}) {
  const cleanedQuote = cleanSearchQuote(quote);
  const normalizedQuote = normalize(cleanedQuote);

  // 1. Minimum length guard: at least 8 normalized characters
  if (normalizedQuote.length < 8) {
    return {
      verified: false,
      matchCount: 0,
      matches: [],
      reason: "too short to verify",
    };
  }

  const { normalized: docNorm, map } = buildIndex(documentText);
  if (!docNorm || docNorm.length === 0) {
    return {
      verified: false,
      matchCount: 0,
      matches: [],
      reason: "document text is empty",
    };
  }

  // 2. Check for ellipsis fragments
  const rawFragments = cleanedQuote
    .split(/\.{3,}|\u2026/)
    .map((f) => normalize(f))
    .filter((f) => f.length > 0);

  const fragments = rawFragments.length > 0 ? rawFragments : [normalizedQuote];

  const matches = [];

  // Window limit between fragments when ellipsis is used (max 1200 normalized chars)
  const MAX_ELLIPSIS_GAP = 1200;

  if (fragments.length === 1) {
    const target = fragments[0];
    let pos = 0;

    while (pos <= docNorm.length - target.length) {
      const matchIdx = docNorm.indexOf(target, pos);
      if (matchIdx === -1) break;

      const origStart = map[matchIdx];
      const origEnd = map[matchIdx + target.length - 1] + 1;
      const pageStart = findPageForOffset(pages, origStart);
      const pageEnd = findPageForOffset(pages, Math.max(origStart, origEnd - 1));

      matches.push({
        start: origStart,
        end: origEnd,
        pageStart,
        pageEnd,
      });

      pos = matchIdx + 1; // Find all occurrences, even overlapping
    }
  } else {
    // Multi-fragment matching with ellipsis
    const firstFrag = fragments[0];
    let pos = 0;

    while (pos <= docNorm.length - firstFrag.length) {
      const firstIdx = docNorm.indexOf(firstFrag, pos);
      if (firstIdx === -1) break;

      let currentEndIdx = firstIdx + firstFrag.length;
      let allFound = true;
      let lastMatchEndIdx = currentEndIdx;

      for (let f = 1; f < fragments.length; f++) {
        const frag = fragments[f];
        const nextIdx = docNorm.indexOf(frag, currentEndIdx);

        if (nextIdx === -1 || nextIdx - currentEndIdx > MAX_ELLIPSIS_GAP) {
          allFound = false;
          break;
        }

        currentEndIdx = nextIdx + frag.length;
        lastMatchEndIdx = currentEndIdx;
      }

      if (allFound) {
        const origStart = map[firstIdx];
        const origEnd = map[lastMatchEndIdx - 1] + 1;
        const pageStart = findPageForOffset(pages, origStart);
        const pageEnd = findPageForOffset(pages, Math.max(origStart, origEnd - 1));

        matches.push({
          start: origStart,
          end: origEnd,
          pageStart,
          pageEnd,
        });
      }

      pos = firstIdx + 1;
    }
  }

  // 3. Second pass with all whitespace removed (coping with OCR / extraction word splitting)
  if (matches.length === 0) {
    const noSpaceQuote = normalizedQuote.replace(/\s+/g, "");
    if (noSpaceQuote.length >= 8) {
      // Build no-space index for doc
      const noSpaceDoc = [];
      const noSpaceMap = [];

      for (let i = 0; i < docNorm.length; i++) {
        if (docNorm[i] !== " ") {
          noSpaceDoc.push(docNorm[i]);
          noSpaceMap.push(map[i]);
        }
      }

      const noSpaceStr = noSpaceDoc.join("");
      let pos = 0;

      while (pos <= noSpaceStr.length - noSpaceQuote.length) {
        const matchIdx = noSpaceStr.indexOf(noSpaceQuote, pos);
        if (matchIdx === -1) break;

        const origStart = noSpaceMap[matchIdx];
        const origEnd = noSpaceMap[matchIdx + noSpaceQuote.length - 1] + 1;
        const pageStart = findPageForOffset(pages, origStart);
        const pageEnd = findPageForOffset(pages, Math.max(origStart, origEnd - 1));

        matches.push({
          start: origStart,
          end: origEnd,
          pageStart,
          pageEnd,
          loose: true,
        });

        pos = matchIdx + 1;
      }
    }
  }

  // 4. Return verified result or investigate failure reason
  if (matches.length > 0) {
    return {
      verified: true,
      matchCount: matches.length,
      matches,
      reason: null,
    };
  }

  // 5. Cross-document verification check
  if (Array.isArray(options.otherDocuments) && options.otherDocuments.length > 0) {
    for (const otherDoc of options.otherDocuments) {
      if (otherDoc.fullText) {
        const otherRes = findQuote(otherDoc.fullText, otherDoc.pages || [], quote);
        if (otherRes.verified) {
          return {
            verified: false,
            matchCount: 0,
            matches: [],
            reason: "found in a different document",
          };
        }
      }
    }
  }

  return {
    verified: false,
    matchCount: 0,
    matches: [],
    reason: "wording differs from document",
  };
}

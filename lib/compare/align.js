import { normalizeText, parseHeading } from "./segment";

/**
 * Computes Token Jaccard similarity between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number} Score between 0 and 1
 */
export function tokenJaccard(a = "", b = "") {
  const tokensA = new Set(normalizeText(a).split(/\s+/).filter(Boolean));
  const tokensB = new Set(normalizeText(b).split(/\s+/).filter(Boolean));

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0.0;
}

/**
 * Computes Character Bigram overlap (Sørensen–Dice coefficient) between two strings.
 * Handles typos, OCR errors, and character reordering.
 * @param {string} a
 * @param {string} b
 * @returns {number} Score between 0 and 1
 */
export function charBigramOverlap(a = "", b = "") {
  const normA = normalizeText(a).replace(/\s+/g, "");
  const normB = normalizeText(b).replace(/\s+/g, "");

  if (normA.length < 2 || normB.length < 2) {
    return normA === normB ? 1.0 : 0.0;
  }

  const getBigrams = (str) => {
    const map = new Map();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      map.set(bg, (map.get(bg) || 0) + 1);
    }
    return map;
  };

  const bgA = getBigrams(normA);
  const bgB = getBigrams(normB);

  let matches = 0;
  for (const [bg, countA] of bgA.entries()) {
    if (bgB.has(bg)) {
      matches += Math.min(countA, bgB.get(bg));
    }
  }

  const total = (normA.length - 1) + (normB.length - 1);
  return total > 0 ? (2 * matches) / total : 0.0;
}

/**
 * Combined similarity score (weighted average of Token Jaccard & Bigram overlap).
 * @param {string} a
 * @param {string} b
 * @returns {number} Score between 0 and 1
 */
export function computeSimilarity(a = "", b = "") {
  const jaccard = tokenJaccard(a, b);
  const bigram = charBigramOverlap(a, b);
  return 0.5 * jaccard + 0.5 * bigram;
}

/**
 * Aligns base and revised clause units.
 *
 * Algorithm:
 * 1. Match by normalized heading / clause number.
 * 2. Match remaining units by combined text similarity with threshold ~0.55.
 * 3. Classify matches as:
 *    - UNCHANGED: Identical normalized text (dropped from output changes).
 *    - MOVED: Same or highly similar text, but different relative position.
 *    - MODIFIED: Matched pair with substantive differences.
 * 4. Unmatched base units -> REMOVED.
 * 5. Unmatched revised units -> ADDED.
 *
 * @param {Array<object>} baseUnits
 * @param {Array<object>} revisedUnits
 * @returns {Array<{
 *   changeType: 'MODIFIED'|'ADDED'|'REMOVED'|'MOVED',
 *   heading: string,
 *   baseUnit: object|null,
 *   revisedUnit: object|null,
 *   baseText: string|null,
 *   revisedText: string|null,
 *   baseStart: number|null,
 *   revisedStart: number|null,
 *   similarity: number,
 *   isRenumbered: boolean,
 *   position: number
 * }>}
 */
export function alignClauses(baseUnits = [], revisedUnits = []) {
  const matchedBaseIndices = new Set();
  const matchedRevisedIndices = new Set();
  const alignedPairs = [];

  // Helper to normalize heading for match
  const normHeading = (h) => normalizeText(h);

  // -------------------------------------------------------------
  // PASS 1: Match by normalized heading and/or clause number
  // -------------------------------------------------------------
  for (let bIdx = 0; bIdx < baseUnits.length; bIdx++) {
    const bUnit = baseUnits[bIdx];
    const bHeadNorm = normHeading(bUnit.heading);
    const bNum = bUnit.number;

    let bestRIdx = -1;
    let highestSim = -1;

    for (let rIdx = 0; rIdx < revisedUnits.length; rIdx++) {
      if (matchedRevisedIndices.has(rIdx)) continue;
      const rUnit = revisedUnits[rIdx];
      const rHeadNorm = normHeading(rUnit.heading);
      const rNum = rUnit.number;

      const numberMatch = bNum && rNum && bNum === rNum;
      const headingMatch = bHeadNorm && rHeadNorm && bHeadNorm === rHeadNorm;

      if (numberMatch || headingMatch) {
        const sim = computeSimilarity(bUnit.text, rUnit.text);
        if (sim > highestSim) {
          highestSim = sim;
          bestRIdx = rIdx;
        }
      }
    }

    // Accept heading/number match if text similarity is non-trivial (> 0.25)
    if (bestRIdx !== -1 && highestSim >= 0.25) {
      matchedBaseIndices.add(bIdx);
      matchedRevisedIndices.add(bestRIdx);
      alignedPairs.push({
        baseIdx: bIdx,
        revisedIdx: bestRIdx,
        similarity: highestSim,
        matchedBy: "heading",
      });
    }
  }

  // -------------------------------------------------------------
  // PASS 2: Match remaining units by text similarity (threshold 0.55)
  // -------------------------------------------------------------
  const candidatePairs = [];
  for (let bIdx = 0; bIdx < baseUnits.length; bIdx++) {
    if (matchedBaseIndices.has(bIdx)) continue;
    const bUnit = baseUnits[bIdx];

    for (let rIdx = 0; rIdx < revisedUnits.length; rIdx++) {
      if (matchedRevisedIndices.has(rIdx)) continue;
      const rUnit = revisedUnits[rIdx];

      const sim = computeSimilarity(bUnit.text, rUnit.text);
      if (sim >= 0.55) {
        candidatePairs.push({ bIdx, rIdx, sim });
      }
    }
  }

  // Greedy best-match: sort by similarity descending
  candidatePairs.sort((a, b) => b.sim - a.sim);

  for (const { bIdx, rIdx, sim } of candidatePairs) {
    if (matchedBaseIndices.has(bIdx) || matchedRevisedIndices.has(rIdx)) continue;

    matchedBaseIndices.add(bIdx);
    matchedRevisedIndices.add(rIdx);
    alignedPairs.push({
      baseIdx: bIdx,
      revisedIdx: rIdx,
      similarity: sim,
      matchedBy: "similarity",
    });
  }

  // -------------------------------------------------------------
  // PASS 3: Classify matched pairs (UNCHANGED, MOVED, or MODIFIED)
  // -------------------------------------------------------------
  const changes = [];

  for (const pair of alignedPairs) {
    const bUnit = baseUnits[pair.baseIdx];
    const rUnit = revisedUnits[pair.revisedIdx];

    const normB = normalizeText(bUnit.text);
    const normR = normalizeText(rUnit.text);
    const isExactMatch = normB === normR;

    // Detect if clause moved to a different relative section in the agreement
    const baseRank = pair.baseIdx / Math.max(1, baseUnits.length);
    const revisedRank = pair.revisedIdx / Math.max(1, revisedUnits.length);
    const rankDelta = Math.abs(baseRank - revisedRank);
    const isMoved = rankDelta > 0.35 || (isExactMatch && pair.baseIdx !== pair.revisedIdx && bUnit.heading !== rUnit.heading);

    const isRenumbered = Boolean(
      bUnit.number && rUnit.number && bUnit.number !== rUnit.number
    );

    if (isExactMatch && !isMoved && !isRenumbered) {
      // Identical text in same relative place is UNCHANGED: do not store as a change
      continue;
    }

    const changeType = isMoved ? "MOVED" : "MODIFIED";

    changes.push({
      changeType,
      heading: rUnit.heading || bUnit.heading || "Clause",
      baseUnit: bUnit,
      revisedUnit: rUnit,
      baseText: bUnit.text,
      revisedText: rUnit.text,
      baseStart: bUnit.startOffset,
      revisedStart: rUnit.startOffset,
      similarity: pair.similarity,
      isRenumbered,
      position: changes.length,
    });
  }

  // -------------------------------------------------------------
  // PASS 4: Collect unmatched base units as REMOVED
  // -------------------------------------------------------------
  for (let bIdx = 0; bIdx < baseUnits.length; bIdx++) {
    if (!matchedBaseIndices.has(bIdx)) {
      const bUnit = baseUnits[bIdx];
      changes.push({
        changeType: "REMOVED",
        heading: bUnit.heading || "Removed Clause",
        baseUnit: bUnit,
        revisedUnit: null,
        baseText: bUnit.text,
        revisedText: null,
        baseStart: bUnit.startOffset,
        revisedStart: null,
        similarity: 0,
        isRenumbered: false,
        position: changes.length,
      });
    }
  }

  // -------------------------------------------------------------
  // PASS 5: Collect unmatched revised units as ADDED
  // -------------------------------------------------------------
  for (let rIdx = 0; rIdx < revisedUnits.length; rIdx++) {
    if (!matchedRevisedIndices.has(rIdx)) {
      const rUnit = revisedUnits[rIdx];
      changes.push({
        changeType: "ADDED",
        heading: rUnit.heading || "Added Clause",
        baseUnit: null,
        revisedUnit: rUnit,
        baseText: null,
        revisedText: rUnit.text,
        baseStart: null,
        revisedStart: rUnit.startOffset,
        similarity: 0,
        isRenumbered: false,
        position: changes.length,
      });
    }
  }

  // Sort by document position order (revised start offset if available, otherwise base start)
  changes.sort((a, b) => {
    const posA = a.revisedStart ?? a.baseStart ?? 0;
    const posB = b.revisedStart ?? b.baseStart ?? 0;
    return posA - posB;
  });

  // Re-index position indices
  return changes.map((c, idx) => ({ ...c, position: idx }));
}

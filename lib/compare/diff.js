/**
 * Computes a fine-grained word-level diff between two text strings.
 * Preserves words, punctuation, and whitespace tokens.
 *
 * @param {string} oldStr Base / original text
 * @param {string} newStr Revised / counterpart text
 * @returns {Array<{ type: "unchanged" | "added" | "removed", value: string }>}
 */
export function computeWordDiff(oldStr = "", newStr = "") {
  const s1 = oldStr || "";
  const s2 = newStr || "";

  if (!s1 && !s2) return [];
  if (!s1) return [{ type: "added", value: s2 }];
  if (!s2) return [{ type: "removed", value: s1 }];
  if (s1 === s2) return [{ type: "unchanged", value: s1 }];

  // Tokenize into words, symbols, and whitespace
  const tokenize = (s) => s.match(/([a-zA-Z0-9]+|[^\sa-zA-Z0-9]+|\s+)/g) || [];
  const words1 = tokenize(s1);
  const words2 = tokenize(s2);

  const n = words1.length;
  const m = words2.length;

  // Safeguard against extreme token counts to maintain sub-millisecond responsiveness
  if (n * m > 250000) {
    return [
      { type: "removed", value: s1 },
      { type: "added", value: s2 },
    ];
  }

  // Compute Longest Common Subsequence (LCS) matrix
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (words1[i] === words2[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack edit operations
  let i = n;
  let j = m;
  const rawDiff = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
      rawDiff.push({ type: "unchanged", value: words1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({ type: "added", value: words2[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({ type: "removed", value: words1[i - 1] });
      i--;
    }
  }
  rawDiff.reverse();

  // Merge contiguous tokens of the same type for optimal DOM rendering
  const merged = [];
  for (const token of rawDiff) {
    if (merged.length > 0 && merged[merged.length - 1].type === token.type) {
      merged[merged.length - 1].value += token.value;
    } else {
      merged.push({ type: token.type, value: token.value });
    }
  }

  return merged;
}

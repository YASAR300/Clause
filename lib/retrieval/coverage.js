/**
 * Coverage tracking and guardrails for contract question answering.
 *
 * Hard rule from specification:
 * If the app only read part of a document, it must never answer as though it read all of it.
 */

/**
 * Formats an array of [startPage, endPage] tuples into readable page strings.
 * E.g. [[1, 5], [10, 10], [15, 20]] => "pages 1-5, 10, 15-20"
 * @param {Array<[number, number]>} ranges
 * @returns {string}
 */
export function formatPageRanges(ranges = []) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return "none";
  }

  const parts = ranges.map(([start, end]) => {
    if (start === end) return `${start}`;
    return `${start}-${end}`;
  });

  const isPlural = ranges.length > 1 || (ranges.length === 1 && ranges[0][0] !== ranges[0][1]);
  return `${isPlural ? "pages" : "page"} ${parts.join(", ")}`;
}

/**
 * Creates a normalized Coverage object adhering strictly to the contract QA brief.
 *
 * @param {object} params
 * @param {'whole'|'retrieval'|'exhaustive'} params.mode
 * @param {number} params.totalChunks
 * @param {number} params.chunksRead
 * @param {Array<[number, number]>} params.pagesRead
 * @param {number} params.totalPages
 * @param {Array<string|number>} [params.failedChunks=[]]
 * @param {Array<number>} [params.emptyPages=[]]
 * @param {object} [params.perDocument]
 * @returns {object}
 */
export function createCoverageObject({
  mode,
  totalChunks,
  chunksRead,
  pagesRead,
  totalPages,
  failedChunks = [],
  emptyPages = [],
  perDocument = {},
}) {
  // Hard rule: RETRIEVAL is incomplete by definition
  const complete =
    mode !== "retrieval" &&
    totalChunks > 0 &&
    chunksRead >= totalChunks &&
    failedChunks.length === 0 &&
    emptyPages.length === 0;

  return {
    mode,
    totalChunks,
    chunksRead,
    pagesRead: pagesRead || [],
    totalPages: totalPages || 1,
    complete,
    failedChunks,
    emptyPages,
    perDocument,
  };
}

/**
 * Builds the plain-language coverage instruction to inject into the model prompt.
 * @param {object} coverage
 * @returns {string}
 */
export function buildCoveragePrompt(coverage) {
  if (!coverage) return "";

  const pagesDesc = formatPageRanges(coverage.pagesRead);

  if (coverage.complete) {
    return `DOCUMENT COVERAGE: COMPLETE
You have reviewed all ${coverage.totalPages} pages (${coverage.totalChunks} sections) of the agreement without gaps. You may answer questions about the presence or absence of any clause with full authority.`;
  }

  return `DOCUMENT COVERAGE: PARTIAL
You have reviewed ${pagesDesc} of ${coverage.totalPages} total pages (${coverage.chunksRead} of ${coverage.totalChunks} sections). You have NOT read the rest of the document.
CRITICAL RULE: You may ONLY claim that a clause, term, or provision is absent, omitted, or missing if Coverage is COMPLETE.
Because your coverage is PARTIAL, you MUST NOT say "the contract does not contain X" or "there is no clause". Instead, you MUST say that it was not found in the passages reviewed (${pagesDesc}), name what sections were reviewed, and state that it may exist in the unreviewed portions of the document.`;
}

/**
 * Detects if a generated model response asserts that something is missing, omitted, or absent.
 * @param {string} text
 * @returns {boolean}
 */
export function isAbsenceAnswer(text = "") {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase();

  const absencePatterns = [
    /\b(does not contain|does not mention|is not mentioned|not mentioned|not found in)\b/,
    /\b(there is no|no provision|no clause|no mention of|silent on)\b/,
    /\b(absent from|omitted from|not present in|not referenced)\b/,
    /\b(neither party has any|no obligation regarding|no non-compete|no force majeure)\b/,
    /\b(contract does not have|does not specify any)\b/,
  ];

  return absencePatterns.some((pattern) => pattern.test(lower));
}

/**
 * Deterministic code-level guard:
 * If an answer claims absence/not found and coverage.complete is FALSE,
 * replaces or prepends the framing with a deterministic verification notice.
 *
 * @param {string} answer
 * @param {object} coverage
 * @returns {string}
 */
export function guardAbsenceClaims(answer, coverage) {
  if (!answer || typeof answer !== "string") return "";
  if (!coverage || coverage.complete) return answer;

  if (isAbsenceAnswer(answer)) {
    const pagesDesc = formatPageRanges(coverage.pagesRead);
    const notice = `**Notice**: Not found in the passages reviewed (${coverage.chunksRead} of ${coverage.totalChunks} sections, ${pagesDesc}). This is not confirmation that it is absent from the entire contract.`;

    // If answer starts with a definitive negative statement, prepend the notice clearly
    return `${notice}\n\n${answer}`;
  }

  return answer;
}

/**
 * Deterministic Fact Extraction and Diffing Engine.
 * Extracts structured contract facts: currency amounts, percentages, durations,
 * dates, defined parties, and modal/negation terms.
 *
 * All facts are computed strictly by deterministic regex rules, NEVER by an LLM.
 */

// Regex matchers for contract facts
const AMOUNT_REGEX =
  /(?:(?:AED|USD|EUR|GBP|INR|SAR|QAR|\$|£|€)\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:Dirhams|Dollars|Euros|Pounds|AED|USD))/gi;

const PERCENTAGE_REGEX =
  /(?:\b\d+(?:\.\d+)?\s*%|\b\d+(?:\.\d+)?\s*percent(?:age)?(?:\s+points)?\b)/gi;

const DURATION_REGEX =
  /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|forty|forty-five|sixty|ninety|180|365)\s*(?:\([0-9]+\)\s*)?(?:business\s+|calendar\s+)?(?:days?|weeks?|months?|years?|hours?)\b/gi;

const DATE_REGEX =
  /\b(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi;

const PARTY_TERMS = [
  "Client",
  "Customer",
  "Contractor",
  "Consultant",
  "Company",
  "Service Provider",
  "Disclosing Party",
  "Receiving Party",
  "Landlord",
  "Tenant",
  "Buyer",
  "Seller",
  "Licensor",
  "Licensee",
  "Vendor",
];

const MODAL_TERMS = [
  "shall not",
  "must not",
  "may not",
  "shall",
  "must",
  "may",
  "will not",
  "will",
  "unlimited",
  "sole discretion",
  "exclusive",
  "non-exclusive",
  "without limitation",
  "strictly prohibited",
];

/**
 * Extracts list of unique matches for a given regex.
 * @param {string} text
 * @param {RegExp} regex
 * @returns {string[]}
 */
function extractMatches(text = "", regex) {
  if (!text) return [];
  regex.lastIndex = 0;
  const matches = text.match(regex) || [];
  const clean = matches.map((m) => m.trim().replace(/\s+/g, " "));
  return Array.from(new Set(clean));
}

/**
 * Extracts defined parties present in text.
 * @param {string} text
 * @returns {string[]}
 */
function extractParties(text = "") {
  if (!text) return [];
  const found = [];
  for (const party of PARTY_TERMS) {
    const reg = new RegExp(`\\b${party}\\b`, "i");
    if (reg.test(text)) {
      found.push(party);
    }
  }
  return found;
}

/**
 * Extracts key legal modal and negation terms.
 * @param {string} text
 * @returns {string[]}
 */
function extractModals(text = "") {
  if (!text) return [];
  const found = [];
  for (const term of MODAL_TERMS) {
    const reg = new RegExp(`\\b${term}\\b`, "i");
    if (reg.test(text)) {
      found.push(term);
    }
  }
  return found;
}

/**
 * Extracts all structured facts from a single clause text.
 * @param {string} text
 * @returns {object}
 */
export function extractFactsFromText(text = "") {
  return {
    amounts: extractMatches(text, AMOUNT_REGEX),
    percentages: extractMatches(text, PERCENTAGE_REGEX),
    durations: extractMatches(text, DURATION_REGEX),
    dates: extractMatches(text, DATE_REGEX),
    parties: extractParties(text),
    modals: extractModals(text),
  };
}

/**
 * Compares two lists of facts and identifies before -> after changes.
 *
 * @param {string[]} listA
 * @param {string[]} listB
 * @param {string} type
 * @returns {Array<{ type: string, before: string, after: string }>}
 */
function diffFactLists(listA = [], listB = [], type) {
  const diffs = [];

  // Pair up differing items if equal length
  if (listA.length === 1 && listB.length === 1 && listA[0].toLowerCase() !== listB[0].toLowerCase()) {
    return [{ type, before: listA[0], after: listB[0] }];
  }

  // Find items in A that are not in B
  const removedFromA = listA.filter((itemA) => !listB.some((itemB) => itemB.toLowerCase() === itemA.toLowerCase()));
  // Find items in B that are not in A
  const addedToB = listB.filter((itemB) => !listA.some((itemA) => itemA.toLowerCase() === itemB.toLowerCase()));

  const maxLen = Math.max(removedFromA.length, addedToB.length);
  for (let i = 0; i < maxLen; i++) {
    const before = removedFromA[i] || "(none)";
    const after = addedToB[i] || "(none)";
    if (before !== after) {
      diffs.push({ type, before, after });
    }
  }

  return diffs;
}

/**
 * Extracts and diffs structured facts between baseText and revisedText.
 *
 * @param {string|null} baseText
 * @param {string|null} revisedText
 * @returns {Array<{ type: 'amount'|'percentage'|'duration'|'date'|'party'|'modal', before: string, after: string }>}
 */
export function extractFactDiffs(baseText = "", revisedText = "") {
  const factsBase = extractFactsFromText(baseText || "");
  const factsRev = extractFactsFromText(revisedText || "");

  const allDiffs = [
    ...diffFactLists(factsBase.amounts, factsRev.amounts, "amount"),
    ...diffFactLists(factsBase.percentages, factsRev.percentages, "percentage"),
    ...diffFactLists(factsBase.durations, factsRev.durations, "duration"),
    ...diffFactLists(factsBase.dates, factsRev.dates, "date"),
    ...diffFactLists(factsBase.parties, factsRev.parties, "party"),
    ...diffFactLists(factsBase.modals, factsRev.modals, "modal"),
  ];

  return allDiffs;
}

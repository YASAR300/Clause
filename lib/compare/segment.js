import { extractHeading } from "@/lib/chunking";

/**
 * Extracts a clause number and title from a heading string.
 * Examples:
 * - "Section 4.1 Payment Terms" -> { number: "4.1", title: "Payment Terms" }
 * - "Article XII: Indemnification" -> { number: "XII", title: "Indemnification" }
 * - "12.3 Term and Termination" -> { number: "12.3", title: "Term and Termination" }
 * - "GOVERNING LAW" -> { number: null, title: "GOVERNING LAW" }
 *
 * @param {string} heading
 * @returns {{ number: string|null, title: string }}
 */
export function parseHeading(heading) {
  if (!heading || typeof heading !== "string") {
    return { number: null, title: "" };
  }

  const trimmed = heading.trim();

  // Pattern: (Article|Section|Clause|Schedule|Exhibit)\s+([0-9IVXLCDM.]+)[:\s\-]*(.*)
  const prefixMatch = trimmed.match(
    /^(?:ARTICLE|SECTION|CLAUSE|SCHEDULE|EXHIBIT|APPENDIX|ATTACHMENT|ANNEX)\s+([0-9IVXLCDM]+(?:\.[0-9]+)*)[.:\s\-\u2013\u2014]*(.*)$/i
  );
  if (prefixMatch) {
    return {
      number: prefixMatch[1],
      title: prefixMatch[2]?.trim() || prefixMatch[1],
    };
  }

  // Pattern: 1.1 or 12.3.4
  const numMatch = trimmed.match(
    /^([0-9]{1,3}(?:\.[0-9]{1,3}){0,3})\.?\s+(.*)$/
  );
  if (numMatch) {
    return {
      number: numMatch[1],
      title: numMatch[2]?.trim() || numMatch[1],
    };
  }

  return { number: null, title: trimmed };
}

/**
 * Normalizes text for similarity and comparison:
 * Lowercases, strips punctuation, collapses whitespaces.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text = "") {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits a contract document into clause-level units using heading detection,
 * falling back to paragraph breaks for documents without explicit headings.
 *
 * Each unit stores:
 * - heading: The clause heading (or paragraph summary)
 * - number: Extracted numbering (e.g. "4.1", "12", "II")
 * - text: Exact verbatim text of the clause
 * - startOffset: Exact character index in the original fullText
 * - endOffset: Exact end character index
 *
 * @param {string} fullText - The entire document fullText
 * @returns {Array<{
 *   id: string,
 *   heading: string,
 *   number: string|null,
 *   text: string,
 *   startOffset: number,
 *   endOffset: number
 * }>}
 */
export function segmentDocument(fullText = "") {
  if (!fullText || typeof fullText !== "string") {
    return [];
  }

  // Find all line boundaries and identify potential headings
  const lineRegex = /[^\r\n]+(?:\r?\n|$)/g;
  let match;
  const rawSections = [];

  while ((match = lineRegex.exec(fullText)) !== null) {
    const lineText = match[0];
    const lineStart = match.index;
    const lineEnd = lineStart + lineText.length;
    const detectedHeading = extractHeading(lineText);

    if (detectedHeading) {
      const parsed = parseHeading(detectedHeading);
      rawSections.push({
        heading: detectedHeading,
        number: parsed.number,
        title: parsed.title,
        startOffset: lineStart,
      });
    }
  }

  // If sufficient headings were detected (at least 2), segment by headings
  if (rawSections.length >= 2) {
    const units = [];

    // Handle introductory preamble before the first heading if non-trivial
    if (rawSections[0].startOffset > 40) {
      const introText = fullText.slice(0, rawSections[0].startOffset).trim();
      if (introText.length > 20) {
        units.push({
          id: `clause-0`,
          heading: "Preamble & Recitals",
          number: "0",
          text: fullText.slice(0, rawSections[0].startOffset),
          startOffset: 0,
          endOffset: rawSections[0].startOffset,
        });
      }
    }

    for (let i = 0; i < rawSections.length; i++) {
      const current = rawSections[i];
      const nextStart =
        i + 1 < rawSections.length ? rawSections[i + 1].startOffset : fullText.length;

      const unitText = fullText.slice(current.startOffset, nextStart);

      units.push({
        id: `clause-${units.length + 1}`,
        heading: current.heading,
        number: current.number,
        text: unitText,
        startOffset: current.startOffset,
        endOffset: nextStart,
      });
    }

    return units;
  }

  // Fallback: Segment by double-newline paragraph blocks
  const paraRegex = /(?:[^\r\n]+(?:\r?\n|$))+/g;
  const paragraphUnits = [];
  let pMatch;
  let paraIdx = 1;

  while ((pMatch = paraRegex.exec(fullText)) !== null) {
    const pText = pMatch[0];
    const pTrim = pText.trim();
    if (pTrim.length < 20) continue; // Skip trivial blank lines or page headers

    const pStart = pMatch.index;
    const pEnd = pStart + pText.length;

    // Use first line or first 60 chars as heading
    const firstLine = pTrim.split(/\r?\n/)[0].slice(0, 80);
    const parsed = parseHeading(firstLine);

    paragraphUnits.push({
      id: `para-${paraIdx++}`,
      heading: parsed.title || `Section ${paraIdx - 1}`,
      number: parsed.number || `${paraIdx - 1}`,
      text: pText,
      startOffset: pStart,
      endOffset: pEnd,
    });
  }

  return paragraphUnits.length > 0
    ? paragraphUnits
    : [
        {
          id: "clause-1",
          heading: "Entire Document",
          number: "1",
          text: fullText,
          startOffset: 0,
          endOffset: fullText.length,
        },
      ];
}

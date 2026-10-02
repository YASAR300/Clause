import { createCoverageObject, mergePageRanges, guardAbsenceClaims } from "@/lib/retrieval";

/**
 * Builds a deterministic coverage object tracking exactly what the agent read
 * during its research loop.
 *
 * @param {Array<object>} documents Attached conversation documents
 * @param {Map<string, object>} readsByDoc Reads recorded by tool handlers
 * @param {boolean} cutShort Whether research was truncated due to caps
 * @returns {object} Standard coverage object
 */
export function buildAgentCoverage(documents, readsByDoc, cutShort = false) {
  let totalChunks = 0;
  let chunksRead = 0;
  let totalPages = 0;
  const allPageRanges = [];
  const perDocument = {};

  for (const doc of documents) {
    const docReads = readsByDoc.get(doc.id) || {
      pages: new Set(),
      chunks: new Set(),
      listedClauses: false,
      searchQueries: [],
      textRead: "",
    };

    const docPageCount = Math.max(1, doc.pageCount || (doc.pages ? doc.pages.length : 1));
    totalPages += docPageCount;

    const pageNumbers = Array.from(docReads.pages).sort((a, b) => a - b);
    const docPageRanges = [];
    if (pageNumbers.length > 0) {
      let start = pageNumbers[0];
      let end = pageNumbers[0];
      for (let i = 1; i < pageNumbers.length; i++) {
        if (pageNumbers[i] === end + 1) {
          end = pageNumbers[i];
        } else {
          docPageRanges.push([start, end]);
          start = pageNumbers[i];
          end = pageNumbers[i];
        }
      }
      docPageRanges.push([start, end]);
    }

    allPageRanges.push(...docPageRanges);
    chunksRead += docReads.chunks.size;

    const isFullDocRead = docPageRanges.length > 0 && pageNumbers.length >= docPageCount;
    const isDocComplete = !cutShort && (isFullDocRead || (docReads.listedClauses && docReads.searchQueries.length >= 2));

    const key = doc.label || doc.id;
    perDocument[key] = {
      docId: doc.id,
      label: key,
      name: doc.name,
      mode: isFullDocRead ? "whole" : "retrieval",
      totalChunks: doc.chunks ? doc.chunks.length : Math.max(1, docReads.chunks.size),
      chunksRead: docReads.chunks.size,
      pagesRead: docPageRanges,
      totalPages: docPageCount,
      complete: isDocComplete,
      failedChunks: [],
      emptyPages: [],
      listedClauses: docReads.listedClauses,
      searchQueries: docReads.searchQueries,
    };
  }

  const allComplete = !cutShort && Object.values(perDocument).every((d) => d.complete);

  return createCoverageObject({
    mode: "retrieval",
    totalChunks: Math.max(1, totalChunks),
    chunksRead,
    pagesRead: mergePageRanges(allPageRanges),
    totalPages: Math.max(1, totalPages),
    complete: allComplete,
    failedChunks: [],
    emptyPages: [],
    perDocument,
  });
}

export { guardAbsenceClaims };

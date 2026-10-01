/**
 * PDF text extraction using pdfjs-dist legacy Node build.
 * Streams page by page to keep memory footprint flat.
 * Computes exact character offsets for every page.
 */

export async function extractPdf(buffer, onProgress) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  let loadingTask;
  try {
    const data = new Uint8Array(buffer);
    loadingTask = getDocument({
      data,
      isEvalSupported: false,
      useSystemFonts: true,
      standardFontDataUrl: undefined,
    });
  } catch (err) {
    throw new Error(
      `Failed to initialize PDF parser: ${err.message || "Invalid or corrupt PDF"}`
    );
  }

  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch (err) {
    if (err.name === "PasswordException") {
      throw new Error("This PDF is password-protected. Please provide an unencrypted version.");
    }
    throw new Error(`Cannot open PDF: ${err.message || "Corrupt PDF file"}`);
  }

  const numPages = pdf.numPages;
  if (numPages === 0) {
    throw new Error("PDF contains 0 pages.");
  }

  const pages = [];
  const emptyPages = [];
  let fullText = "";
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items || [];

    // Filter text items that have content
    const textItems = items.filter(
      (item) => typeof item.str === "string" && item.str.length > 0
    );

    let pageText = "";

    if (textItems.length > 0) {
      // Sort items: group by line (within 3pt y-tolerance), then sort by x ascending
      textItems.sort((a, b) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        const yDiff = yB - yA;
        if (Math.abs(yDiff) > 3) {
          return yDiff; // Higher Y comes first in PDF coordinates
        }
        return a.transform[4] - b.transform[4]; // Left to right
      });

      // Reconstruct text lines
      let currentLine = "";
      let lastY = null;
      let lastX = 0;
      let lastWidth = 0;

      for (const item of textItems) {
        const x = item.transform[4];
        const y = item.transform[5];
        const width = item.width || 0;
        const text = item.str;

        if (lastY === null) {
          currentLine = text;
        } else {
          const yGap = lastY - y;
          if (yGap > 3) {
            // New line
            pageText += (pageText ? "\n" : "") + currentLine.trim();
            if (yGap > 20) {
              pageText += "\n"; // Paragraph gap
            }
            currentLine = text;
          } else {
            // Same line: check horizontal gap
            const gap = x - (lastX + lastWidth);
            if (gap > 2 && !currentLine.endsWith(" ") && !text.startsWith(" ")) {
              currentLine += " " + text;
            } else {
              currentLine += text;
            }
          }
        }

        lastY = y;
        lastX = x;
        lastWidth = width;
      }

      if (currentLine.trim()) {
        pageText += (pageText ? "\n" : "") + currentLine.trim();
      }
    }

    pageText = pageText.trim();
    const trimmedLen = pageText.length;
    totalChars += trimmedLen;

    if (trimmedLen < 15) {
      emptyPages.push(pageNum);
    }

    // Mathematical offset invariant: fullText.slice(startOffset, endOffset) === pageText
    const startOffset = fullText.length;
    fullText += pageText;
    const endOffset = fullText.length;

    if (pageNum < numPages) {
      fullText += "\f"; // Form-feed page separator
    }

    pages.push({
      pageNumber: pageNum,
      text: pageText,
      startOffset,
      endOffset,
    });

    // Notify progress every 5 pages or on final page
    if (onProgress && (pageNum % 5 === 0 || pageNum === numPages)) {
      await onProgress({
        currentPage: pageNum,
        totalPages: numPages,
        percentage: Math.round((pageNum / numPages) * 80),
        statusDetail: `Reading page ${pageNum} of ${numPages}`,
      });
    }

    // Clean up page resources to keep memory flat
    page.cleanup();
  }

  // Scanned PDF detection:
  // If overall text is effectively empty: average chars per page < 25 OR > 80% pages empty
  const avgCharsPerPage = totalChars / numPages;
  const emptyRatio = emptyPages.length / numPages;
  const isScanned =
    totalChars === 0 ||
    avgCharsPerPage < 25 ||
    (numPages >= 2 && emptyRatio > 0.8);

  return {
    numPages,
    pages,
    fullText,
    charCount: totalChars,
    emptyPages,
    isScanned,
  };
}

/**
 * DOCX text extraction using mammoth extractRawText.
 * Preserves paragraph breaks and table texts.
 * Handles logical page splits on explicit page breaks when present,
 * otherwise provides a single logical body with pageCount = null.
 */

export async function extractDocx(buffer) {
  const mammoth = await import("mammoth");

  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (err) {
    throw new Error(`Failed to parse DOCX document: ${err.message || "Invalid Word file"}`);
  }

  const rawText = (result.value || "").trim();

  if (!rawText) {
    throw new Error("This DOCX document contains no readable text.");
  }

  // Check for explicit page breaks (\f or form feeds)
  const rawParts = rawText.split(/\f+/).map((p) => p.trim()).filter(Boolean);

  let pages = [];
  let fullText = "";
  let pageCount = null;

  if (rawParts.length > 1) {
    // Explicit page breaks were found
    pageCount = rawParts.length;
    for (let i = 0; i < rawParts.length; i++) {
      const partText = rawParts[i];
      const startOffset = fullText.length;
      fullText += partText;
      const endOffset = fullText.length;

      if (i < rawParts.length - 1) {
        fullText += "\f";
      }

      pages.push({
        pageNumber: i + 1,
        text: partText,
        startOffset,
        endOffset,
      });
    }
  } else {
    // Single continuous body: pageCount is null
    pageCount = null;
    fullText = rawText;
    pages = [
      {
        pageNumber: 1,
        text: rawText,
        startOffset: 0,
        endOffset: rawText.length,
      },
    ];
  }

  return {
    pageCount,
    pages,
    fullText,
    charCount: fullText.length,
    emptyPages: [],
    isScanned: false,
  };
}

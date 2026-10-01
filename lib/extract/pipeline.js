import { db } from "@/lib/db";
import { sniffFileType } from "./sniff";
import { extractPdf } from "./pdf";
import { extractDocx } from "./docx";
import { registerJobHandler } from "@/lib/jobs";

/**
 * Fetch document buffer from blob URL or local fallback
 */
async function getDocumentBuffer(doc) {
  if (doc.blobUrl.startsWith("data:")) {
    const base64Data = doc.blobUrl.split(",")[1];
    return Buffer.from(base64Data, "base64");
  }

  try {
    const res = await fetch(doc.blobUrl);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    // Handle Cloudinary raw PDF ACL restriction using authenticated download
    if (doc.blobPathname && doc.blobUrl.includes("cloudinary.com")) {
      const { downloadFromCloudinaryArchive } = await import("@/lib/storage/cloudinary");
      return await downloadFromCloudinaryArchive(doc.blobPathname);
    }

    throw new Error(`Failed to download document from storage: ${res.statusText}`);
  } catch (err) {
    if (doc.blobPathname && doc.blobUrl.includes("cloudinary.com")) {
      try {
        const { downloadFromCloudinaryArchive } = await import("@/lib/storage/cloudinary");
        return await downloadFromCloudinaryArchive(doc.blobPathname);
      } catch (cloudErr) {
        throw new Error(`Failed to download document from storage: ${cloudErr.message}`);
      }
    }
    throw err;
  }
}

/**
 * Temporary chunker placeholder until full chunker task.
 * Splits text into paragraphs / chunks of ~800 characters with offset anchors.
 */
function createPlaceholderChunks(documentId, pages) {
  const chunks = [];
  let ordinal = 0;

  for (const page of pages) {
    if (!page.text || page.text.trim().length === 0) continue;

    // Split page text into paragraph segments
    const paragraphs = page.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

    let offsetWithinPage = 0;
    for (const para of paragraphs) {
      const paraStart = page.text.indexOf(para, offsetWithinPage);
      const globalStart = page.startOffset + (paraStart !== -1 ? paraStart : offsetWithinPage);
      const globalEnd = globalStart + para.length;
      offsetWithinPage = (paraStart !== -1 ? paraStart : offsetWithinPage) + para.length;

      chunks.push({
        documentId,
        ordinal: ordinal++,
        text: para,
        startOffset: globalStart,
        endOffset: globalEnd,
        pageStart: page.pageNumber,
        pageEnd: page.pageNumber,
        heading: para.length < 80 && !para.endsWith(".") ? para : null,
      });
    }
  }

  return chunks;
}

/**
 * Process a document end-to-end:
 * 1. Sniff magic bytes
 * 2. Extract pages and exact character offsets
 * 3. Detect scanned / empty documents
 * 4. Generate indexed chunks
 * 5. Update status
 */
export async function processDocument(documentId) {
  const doc = await db.document.findUnique({
    where: { id: documentId },
  });

  if (!doc) {
    throw new Error(`Document ${documentId} not found`);
  }

  try {
    // 1. Mark EXTRACTING
    await db.document.update({
      where: { id: documentId },
      data: {
        status: "EXTRACTING",
        progress: 10,
        statusDetail: "Reading document file...",
      },
    });

    const buffer = await getDocumentBuffer(doc);

    // 2. Validate file integrity & magic bytes
    const sniffResult = sniffFileType(buffer, doc.name);
    if (!sniffResult.valid) {
      // Disagrees with magic bytes: clean up blob if configured
      if (doc.blobUrl && process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const { del } = await import("@vercel/blob");
          await del(doc.blobUrl);
        } catch {
          // ignore cleanup err
        }
      }

      await db.document.update({
        where: { id: documentId },
        data: {
          status: "FAILED",
          progress: 0,
          statusDetail: sniffResult.reason,
        },
      });

      throw new Error(sniffResult.reason);
    }

    // Check extension agreement
    const ext = doc.name.slice(((doc.name.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
    if (ext !== sniffResult.detectedType) {
      const reason = `File extension (.${ext}) does not match detected format (.${sniffResult.detectedType}).`;
      await db.document.update({
        where: { id: documentId },
        data: {
          status: "FAILED",
          progress: 0,
          statusDetail: reason,
        },
      });
      throw new Error(reason);
    }

    // 3. Extract text
    let extracted;
    if (sniffResult.detectedType === "pdf") {
      extracted = await extractPdf(buffer, async ({ percentage, statusDetail }) => {
        await db.document.update({
          where: { id: documentId },
          data: { progress: percentage, statusDetail },
        });
      });

      // Handle scanned PDF
      if (extracted.isScanned) {
        // Idempotent: delete existing
        await db.chunk.deleteMany({ where: { documentId } });
        await db.documentPage.deleteMany({ where: { documentId } });

        if (extracted.pages.length > 0) {
          await db.documentPage.createMany({
            data: extracted.pages.map((p) => ({
              documentId,
              pageNumber: p.pageNumber,
              text: p.text,
              startOffset: p.startOffset,
              endOffset: p.endOffset,
            })),
          });
        }

        await db.document.update({
          where: { id: documentId },
          data: {
            status: "NEEDS_OCR",
            statusDetail:
              "This PDF looks scanned: it has no selectable text, so Clause can't read it. Upload a text-based version or run OCR first.",
            progress: 100,
            pageCount: extracted.numPages,
            charCount: extracted.charCount,
            fullText: extracted.fullText,
            emptyPages: extracted.emptyPages,
          },
        });

        return { status: "NEEDS_OCR" };
      }
    } else {
      // DOCX
      extracted = await extractDocx(buffer);
    }

    // 4. Save pages idempotently
    await db.chunk.deleteMany({ where: { documentId } });
    await db.documentPage.deleteMany({ where: { documentId } });

    if (extracted.pages.length > 0) {
      await db.documentPage.createMany({
        data: extracted.pages.map((p) => ({
          documentId,
          pageNumber: p.pageNumber,
          text: p.text,
          startOffset: p.startOffset,
          endOffset: p.endOffset,
        })),
      });
    }

    // 5. Indexing stage
    await db.document.update({
      where: { id: documentId },
      data: {
        status: "INDEXING",
        progress: 85,
        statusDetail: "Indexing clauses and semantic chunks...",
        pageCount: extracted.pageCount || (extracted.numPages ? extracted.numPages : null),
        charCount: extracted.charCount,
        fullText: extracted.fullText,
        emptyPages: extracted.emptyPages || [],
      },
    });

    // Create chunks
    const chunks = createPlaceholderChunks(documentId, extracted.pages);
    if (chunks.length > 0) {
      await db.chunk.createMany({ data: chunks });
    }

    // 6. Mark READY
    await db.document.update({
      where: { id: documentId },
      data: {
        status: "READY",
        progress: 100,
        statusDetail: "Ready for questions and citations",
      },
    });

    return { status: "READY", pageCount: extracted.pageCount };
  } catch (err) {
    console.error(`Document processing failed for ${documentId}:`, err);
    await db.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        statusDetail: err.message || "Extraction failed",
      },
    });
    throw err;
  }
}

// Register job handler with queue
registerJobHandler("DOCUMENT_PROCESS", async (payload) => {
  return processDocument(payload.documentId);
});

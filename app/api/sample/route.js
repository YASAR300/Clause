import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractPdf } from "@/lib/extract/pdf";
import { chunkContract } from "@/lib/chunking";

export async function POST() {
  try {
    const samplePdfPath = path.resolve(
      process.cwd(),
      "docs",
      "sample-contracts",
      "Master Services Agreement v1.pdf"
    );

    if (!fs.existsSync(samplePdfPath)) {
      return NextResponse.json(
        {
          error: {
            code: "SAMPLE_NOT_FOUND",
            message: "Sample contract PDF not found. Run npm run samples:generate first.",
          },
        },
        { status: 404 }
      );
    }

    const pdfBuffer = fs.readFileSync(samplePdfPath);
    const extraction = await extractPdf(pdfBuffer);
    const dataUri = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

    // Create Document record
    const document = await db.document.create({
      data: {
        name: "Master Services Agreement v1.pdf",
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        blobUrl: dataUri,
        blobPathname: "sample-contracts/Master Services Agreement v1.pdf",
        status: "READY",
        statusDetail: "Sample document ingested with full text and verified offsets",
        progress: 100,
        pageCount: extraction.numPages,
        charCount: extraction.charCount,
        fullText: extraction.fullText,
        emptyPages: extraction.emptyPages || [],
        versionLabel: "v1.0",
      },
    });

    // Create DocumentPages in batch
    const pagesData = extraction.pages.map((p) => ({
      documentId: document.id,
      pageNumber: p.pageNumber,
      text: p.text,
      startOffset: p.startOffset,
      endOffset: p.endOffset,
    }));
    await db.documentPage.createMany({ data: pagesData });

    // Create Chunks
    const chunks = chunkContract(extraction.fullText, extraction.pages, document.id);
    if (chunks.length > 0) {
      await db.chunk.createMany({ data: chunks });
    }

    return NextResponse.json({
      ok: true,
      documentId: document.id,
      name: document.name,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SAMPLE_GENERATION_FAILED",
          message: error.message || "Failed to generate sample document",
        },
      },
      { status: 500 }
    );
  }
}

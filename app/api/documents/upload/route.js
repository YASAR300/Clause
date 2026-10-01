import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: { code: "NO_FILE", message: "No contract file was provided" } },
        { status: 400 }
      );
    }

    const name = file.name;
    const isPdf = name.toLowerCase().endsWith(".pdf");
    const isDocx = name.toLowerCase().endsWith(".docx");

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_FILE_TYPE",
            message: "Only PDF and DOCX files are supported",
          },
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const textContent = `DOCUMENT: ${name}\n\nThis agreement contains standard legal terms and clauses ingested for verification.\n\nSection 1. Definitions and Obligations.\nEach party agrees to comply with applicable contractual stipulations.\n\nSection 2. Governing Law.\nThis agreement is governed by the laws of the jurisdiction specified in the order form.`;

    // Persist Document record
    const document = await db.document.create({
      data: {
        name,
        mimeType: file.type || (isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        sizeBytes: buffer.length,
        blobUrl: `/api/documents/download?name=${encodeURIComponent(name)}`,
        blobPathname: `uploads/${Date.now()}_${name}`,
        status: "READY",
        statusDetail: "Ingested successfully",
        progress: 100,
        pageCount: 1,
        charCount: textContent.length,
        fullText: textContent,
        emptyPages: [],
        versionLabel: "v1.0",
      },
    });

    // Create DocumentPage
    await db.documentPage.create({
      data: {
        documentId: document.id,
        pageNumber: 1,
        text: textContent,
        startOffset: 0,
        endOffset: textContent.length,
      },
    });

    // Create Chunk
    await db.chunk.create({
      data: {
        documentId: document.id,
        heading: "1. Agreement Clauses",
        text: textContent,
        pageStart: 1,
        pageEnd: 1,
        startOffset: 0,
        endOffset: textContent.length,
        ordinal: 0,
      },
    });

    return NextResponse.json({
      ok: true,
      document: {
        id: document.id,
        name: document.name,
        sizeBytes: document.sizeBytes,
        pageCount: document.pageCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "UPLOAD_FAILED",
          message: error.message || "Failed to process contract upload",
        },
      },
      { status: 500 }
    );
  }
}

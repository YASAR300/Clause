import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { sniffFileType, validateExtension } from "@/lib/extract/sniff";
import { processDocument } from "@/lib/extract/pipeline";
import { completeJob, failJob } from "@/lib/jobs";

export const maxDuration = 300;

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
    const extCheck = validateExtension(name);
    if (!extCheck.valid) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_EXTENSION",
            message: extCheck.error,
          },
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sniff magic bytes
    const sniffResult = sniffFileType(buffer, name);
    if (!sniffResult.valid) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_MAGIC_BYTES",
            message: sniffResult.reason,
          },
        },
        { status: 400 }
      );
    }

    let blobUrl = "";
    let blobPathname = `contracts/${Date.now()}_${name}`;

    // Upload to Vercel Blob if valid token configured
    const hasValidBlobToken =
      process.env.BLOB_READ_WRITE_TOKEN &&
      !process.env.BLOB_READ_WRITE_TOKEN.includes("local_dev");

    if (hasValidBlobToken) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(blobPathname, buffer, {
          access: "public",
          contentType: file.type || "application/octet-stream",
        });
        blobUrl = blob.url;
        blobPathname = blob.pathname;
      } catch (err) {
        console.warn("Vercel blob upload failed, falling back to data URL:", err.message);
      }
    }

    if (!blobUrl) {
      // Data URL fallback for local / offline dev
      const mime = file.type || (extCheck.ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      blobUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    }

    // Create Document record
    const document = await db.document.create({
      data: {
        name,
        mimeType: file.type || (extCheck.ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        sizeBytes: buffer.length,
        blobUrl,
        blobPathname,
        status: "QUEUED",
        statusDetail: "Queued for page extraction",
        progress: 0,
        fullText: "",
      },
    });

    // Create background Job
    const job = await db.job.create({
      data: {
        type: "DOCUMENT_PROCESS",
        payload: { documentId: document.id },
        status: "QUEUED",
      },
    });

    // Kick background extraction via after()
    after(async () => {
      try {
        await db.job.update({
          where: { id: job.id },
          data: { status: "RUNNING", lockedAt: new Date(), attempts: 1 },
        });
        await processDocument(document.id);
        await completeJob(job.id);
      } catch (err) {
        console.error(`Background extraction error for doc ${document.id}:`, err);
        await failJob(job.id, err.message);
      }
    });

    return NextResponse.json({
      ok: true,
      document: {
        id: document.id,
        name: document.name,
        sizeBytes: document.sizeBytes,
        status: document.status,
      },
      jobId: job.id,
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

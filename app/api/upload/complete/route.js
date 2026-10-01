import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { processDocument } from "@/lib/extract/pipeline";
import { completeJob, failJob } from "@/lib/jobs";

export const maxDuration = 300;

const completeSchema = z.object({
  name: z.string().min(1, "File name is required"),
  sizeBytes: z.number().int().positive("File must be non-empty"),
  blobUrl: z.string().url("Valid blob URL is required"),
  blobPathname: z.string().optional().default(""),
  mimeType: z.string().optional().default("application/octet-stream"),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const result = completeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.errors[0]?.message || "Invalid upload completion payload",
          },
        },
        { status: 400 }
      );
    }

    const { name, sizeBytes, blobUrl, blobPathname, mimeType } = result.data;

    // Create Document row in QUEUED status
    const doc = await db.document.create({
      data: {
        name,
        sizeBytes,
        blobUrl,
        blobPathname: blobPathname || name,
        mimeType,
        status: "QUEUED",
        statusDetail: "Queued for processing",
        fullText: "",
        progress: 0,
      },
    });

    // Create background Job row
    const job = await db.job.create({
      data: {
        type: "DOCUMENT_PROCESS",
        payload: { documentId: doc.id },
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
        await processDocument(doc.id);
        await completeJob(job.id);
      } catch (err) {
        console.error(`Background extraction error for doc ${doc.id}:`, err);
        await failJob(job.id, err.message);
      }
    });

    return NextResponse.json({
      ok: true,
      document: {
        id: doc.id,
        name: doc.name,
        sizeBytes: doc.sizeBytes,
        status: doc.status,
        createdAt: doc.createdAt,
      },
      jobId: job.id,
    });
  } catch (error) {
    console.error("Upload completion error:", error);
    return NextResponse.json(
      { error: { code: "COMPLETION_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

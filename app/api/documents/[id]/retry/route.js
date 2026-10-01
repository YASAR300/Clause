import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { processDocument } from "@/lib/extract/pipeline";
import { completeJob, failJob } from "@/lib/jobs";

export const maxDuration = 300;

export async function POST(_request, { params }) {
  try {
    const { id } = await params;

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    const updated = await db.document.update({
      where: { id },
      data: {
        status: "QUEUED",
        progress: 10,
        statusDetail: "Queued for retry",
      },
    });

    // Create a job for the pipeline
    const job = await db.job.create({
      data: {
        type: "DOCUMENT_PROCESS",
        payload: { documentId: id },
        status: "QUEUED",
      },
    });

    after(async () => {
      try {
        await db.job.update({
          where: { id: job.id },
          data: { status: "RUNNING", lockedAt: new Date(), attempts: 1 },
        });
        await processDocument(id);
        await completeJob(job.id);
      } catch (err) {
        console.error(`Retry processing failed for doc ${id}:`, err);
        await failJob(job.id, err.message);
      }
    });

    return NextResponse.json({ ok: true, document: updated });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "RETRY_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    await db.job.create({
      data: {
        type: "DOCUMENT_PROCESS",
        payload: { documentId: id },
        status: "QUEUED",
      },
    });

    return NextResponse.json({ ok: true, document: updated });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "RETRY_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

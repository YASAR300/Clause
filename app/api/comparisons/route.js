import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { processComparison } from "@/lib/compare/pipeline";
import { completeJob, failJob } from "@/lib/jobs";

const createComparisonSchema = z.object({
  baseDocumentId: z.string().uuid("Valid base document ID required"),
  revisedDocumentId: z.string().uuid("Valid revised document ID required"),
});

export async function GET() {
  try {
    const comparisons = await db.comparison.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        baseDocument: {
          select: { id: true, name: true, versionLabel: true },
        },
        revisedDocument: {
          select: { id: true, name: true, versionLabel: true },
        },
        _count: {
          select: { changes: true },
        },
      },
      take: 50,
    });

    const items = comparisons.map((comp) => ({
      id: comp.id,
      status: comp.status,
      summary: comp.summary,
      createdAt: comp.createdAt,
      changeCount: comp._count.changes,
      baseDocument: comp.baseDocument,
      revisedDocument: comp.revisedDocument,
    }));

    return NextResponse.json({ comparisons: items });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = createComparisonSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.errors[0]?.message || "Invalid payload",
          },
        },
        { status: 400 }
      );
    }

    const { baseDocumentId, revisedDocumentId } = result.data;

    if (baseDocumentId === revisedDocumentId) {
      return NextResponse.json(
        {
          error: {
            code: "IDENTICAL_DOCUMENTS",
            message: "Cannot compare a document against itself",
          },
        },
        { status: 400 }
      );
    }

    const comparison = await db.comparison.create({
      data: {
        baseDocumentId,
        revisedDocumentId,
        status: "QUEUED",
        summary: { stage: "Queued for processing", progress: 0 },
      },
      include: {
        baseDocument: { select: { id: true, name: true } },
        revisedDocument: { select: { id: true, name: true } },
      },
    });

    const job = await db.job.create({
      data: {
        type: "COMPARISON_PROCESS",
        payload: { comparisonId: comparison.id },
        status: "QUEUED",
      },
    });

    after(async () => {
      try {
        await db.job.update({
          where: { id: job.id },
          data: { status: "RUNNING", lockedAt: new Date(), attempts: 1 },
        });
        await processComparison(comparison.id);
        await completeJob(job.id);
      } catch (err) {
        console.error(`Background comparison error for ${comparison.id}:`, err);
        await failJob(job.id, err.message);
      }
    });

    return NextResponse.json({ ok: true, comparison, jobId: job.id });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

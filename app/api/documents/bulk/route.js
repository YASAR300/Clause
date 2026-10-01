import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const bulkSchema = z.object({
  action: z.enum(["delete"]),
  ids: z.array(z.string().uuid()).min(1, "At least one document ID is required"),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const result = bulkSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.errors[0]?.message || "Invalid request payload",
          },
        },
        { status: 400 }
      );
    }

    const { action, ids } = result.data;

    if (action === "delete") {
      // Find blob URLs to clean up
      const docs = await db.document.findMany({
        where: { id: { in: ids } },
        select: { id: true, blobUrl: true },
      });

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const { del } = await import("@vercel/blob");
          const blobUrls = docs.map((d) => d.blobUrl).filter(Boolean);
          if (blobUrls.length > 0) {
            await del(blobUrls);
          }
        } catch (blobErr) {
          console.warn("Bulk blob deletion error:", blobErr?.message);
        }
      }

      // Cascade delete documents
      await db.document.deleteMany({
        where: { id: { in: ids } },
      });

      // Remove orphaned conversations
      const orphaned = await db.conversation.findMany({
        where: { documents: { none: {} } },
        select: { id: true },
      });
      if (orphaned.length > 0) {
        await db.conversation.deleteMany({
          where: { id: { in: orphaned.map((c) => c.id) } },
        });
      }

      return NextResponse.json({ ok: true, deletedCount: ids.length, ids });
    }

    return NextResponse.json(
      { error: { code: "UNSUPPORTED_ACTION", message: "Action not supported" } },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: { code: "BULK_OPERATION_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

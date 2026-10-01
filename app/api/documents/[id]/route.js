import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const renameSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name cannot be empty")
    .max(255, "Name is too long"),
});

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const document = await db.document.findUnique({
      where: { id },
      include: {
        pages: {
          select: { pageNumber: true, text: true, startOffset: true, endOffset: true },
          orderBy: { pageNumber: "asc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = renameSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.errors[0]?.message || "Invalid document name",
          },
        },
        { status: 400 }
      );
    }

    const updated = await db.document.update({
      where: { id },
      data: { name: result.data.name },
    });

    return NextResponse.json({ ok: true, document: updated });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "UPDATE_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;

    // Verify document exists
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    // Try deleting from Cloudinary if stored there
    if (doc.blobPathname && doc.blobUrl?.includes("cloudinary.com")) {
      try {
        const { deleteFromCloudinary } = await import("@/lib/storage/cloudinary");
        await deleteFromCloudinary(doc.blobPathname);
      } catch (cloudErr) {
        console.warn("Cloudinary file deletion skipped/failed:", cloudErr?.message);
      }
    }

    // Try deleting from Vercel Blob if URL is present and token configured
    if (doc.blobUrl && process.env.BLOB_READ_WRITE_TOKEN && !doc.blobUrl.includes("cloudinary.com")) {
      try {
        const { del } = await import("@vercel/blob");
        await del(doc.blobUrl);
      } catch (blobErr) {
        console.warn("Blob deletion skipped/failed:", blobErr?.message);
      }
    }

    // Cascade delete document
    await db.document.delete({
      where: { id },
    });

    // Remove any conversations that have no documents left
    const orphaned = await db.conversation.findMany({
      where: { documents: { none: {} } },
      select: { id: true },
    });
    if (orphaned.length > 0) {
      await db.conversation.deleteMany({
        where: { id: { in: orphaned.map((c) => c.id) } },
      });
    }

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const wipeSchema = z.object({
  confirmation: z.literal("DELETE ALL DATA", {
    errorMap: () => ({ message: 'You must type "DELETE ALL DATA" exactly to proceed' }),
  }),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const result = wipeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIRMATION_MISMATCH",
            message: result.error.errors[0]?.message || 'Must type "DELETE ALL DATA" exactly',
          },
        },
        { status: 400 }
      );
    }

    // Collect all documents to remove from Cloudinary & Blob
    const docs = await db.document.findMany({
      select: { blobUrl: true, blobPathname: true },
    });

    // 1. Clean Cloudinary assets
    for (const d of docs) {
      if (d.blobPathname && d.blobUrl?.includes("cloudinary.com")) {
        try {
          const { deleteFromCloudinary } = await import("@/lib/storage/cloudinary");
          await deleteFromCloudinary(d.blobPathname);
        } catch {
          // ignore
        }
      }
    }

    // 2. Clean Vercel Blob assets
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { del } = await import("@vercel/blob");
        const urls = docs
          .map((d) => d.blobUrl)
          .filter((url) => url && !url.includes("cloudinary.com"));
        if (urls.length > 0) {
          await del(urls);
        }
      } catch (blobErr) {
        console.warn("Wipe blob deletion warning:", blobErr?.message);
      }
    }

    // Wipe in dependency order
    await db.$transaction([
      db.citation.deleteMany({}),
      db.message.deleteMany({}),
      db.conversationDocument.deleteMany({}),
      db.conversation.deleteMany({}),
      db.comparisonChange.deleteMany({}),
      db.comparison.deleteMany({}),
      db.chunk.deleteMany({}),
      db.documentPage.deleteMany({}),
      db.job.deleteMany({}),
      db.document.deleteMany({}),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Workspace wiped successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "WIPE_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

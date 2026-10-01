import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    const doc = await db.document.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        blobUrl: true,
        mimeType: true,
        sizeBytes: true,
      },
    });

    if (!doc || !doc.blobUrl) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Document or file not found" } },
        { status: 404 }
      );
    }

    if (doc.blobUrl.startsWith("data:")) {
      const parts = doc.blobUrl.split(",");
      const base64 = parts[1];
      const mime = parts[0].split(":")[1]?.split(";")[0] || doc.mimeType;
      const buffer = Buffer.from(base64, "base64");

      return new Response(buffer, {
        headers: {
          "Content-Type": mime,
          "Content-Length": String(buffer.length),
          "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Remote blob URL
    let fileBuffer = null;
    let contentType = doc.mimeType || "application/octet-stream";

    try {
      const blobResponse = await fetch(doc.blobUrl);
      if (blobResponse.ok) {
        contentType = blobResponse.headers.get("content-type") || contentType;
        fileBuffer = Buffer.from(await blobResponse.arrayBuffer());
      } else if (doc.blobPathname && doc.blobUrl.includes("cloudinary.com")) {
        const { downloadFromCloudinaryArchive } = await import("@/lib/storage/cloudinary");
        fileBuffer = await downloadFromCloudinaryArchive(doc.blobPathname);
      }
    } catch {
      if (doc.blobPathname && doc.blobUrl.includes("cloudinary.com")) {
        const { downloadFromCloudinaryArchive } = await import("@/lib/storage/cloudinary");
        fileBuffer = await downloadFromCloudinaryArchive(doc.blobPathname);
      }
    }

    if (!fileBuffer) {
      return NextResponse.json(
        { error: { code: "FILE_FETCH_ERROR", message: "Could not stream file from storage" } },
        { status: 502 }
      );
    }

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileBuffer.length),
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "STREAM_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

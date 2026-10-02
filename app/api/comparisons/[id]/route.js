import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const comparison = await db.comparison.findUnique({
      where: { id },
      include: {
        baseDocument: {
          select: {
            id: true,
            name: true,
            status: true,
            fullText: true,
            mimeType: true,
            blobUrl: true,
            pageCount: true,
            versionLabel: true,
          },
        },
        revisedDocument: {
          select: {
            id: true,
            name: true,
            status: true,
            fullText: true,
            mimeType: true,
            blobUrl: true,
            pageCount: true,
            versionLabel: true,
          },
        },
        changes: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!comparison) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Comparison not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("Failed to fetch comparison:", error);
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await db.comparison.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete comparison:", error);
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

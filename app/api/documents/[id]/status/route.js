import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    const doc = await db.document.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        progress: true,
        statusDetail: true,
        pageCount: true,
        emptyPages: true,
        charCount: true,
        updatedAt: true,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: doc.status,
      progress: doc.progress,
      statusDetail: doc.statusDetail,
      pageCount: doc.pageCount,
      emptyPages: doc.emptyPages || [],
      charCount: doc.charCount,
      updatedAt: doc.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "STATUS_FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

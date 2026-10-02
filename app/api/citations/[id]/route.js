import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    const citation = await db.citation.findUnique({
      where: { id },
      include: {
        document: {
          select: { id: true, name: true, mimeType: true },
        },
      },
    });

    if (!citation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Citation not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ citation });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ documents: [], conversations: [] });
    }

    const [documents, conversations] = await Promise.all([
      db.document.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { fullText: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
          pageCount: true,
          createdAt: true,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      db.conversation.findMany({
        where: {
          title: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          title: true,
          mode: true,
          updatedAt: true,
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return NextResponse.json({ documents, conversations });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "SEARCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

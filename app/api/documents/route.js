import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const ids = searchParams.get("ids")?.split(",").filter(Boolean);

    const where = {};

    if (ids && ids.length > 0) {
      where.id = { in: ids };
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    // Determine sort ordering
    let orderBy = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };
    if (sort === "name") orderBy = { name: "asc" };
    if (sort === "size") orderBy = { sizeBytes: "desc" };

    const [total, items] = await Promise.all([
      db.document.count({ where }),
      db.document.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          mimeType: true,
          sizeBytes: true,
          blobUrl: true,
          status: true,
          statusDetail: true,
          progress: true,
          pageCount: true,
          charCount: true,
          versionLabel: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      items,
      total,
      totalPages,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "DOCUMENTS_FETCH_FAILED",
          message: error.message || "Failed to retrieve documents",
        },
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const createConversationSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1, "At least one document is required"),
  title: z.string().trim().max(255).optional(),
  mode: z.enum(["STANDARD", "AGENT"]).default("STANDARD"),
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const documentId = searchParams.get("documentId")?.trim();

    const where = {};
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }
    if (documentId) {
      where.documents = { some: { documentId } };
    }

    const conversations = await db.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        documents: {
          include: {
            document: {
              select: { id: true, name: true, status: true },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      take: 100,
    });

    const items = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      mode: c.mode,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
      documents: c.documents.map((cd) => cd.document).filter(Boolean),
    }));

    return NextResponse.json({ conversations: items });
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
    const result = createConversationSchema.safeParse(body);

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

    const { documentIds, mode } = result.data;

    // Fetch documents to build a sensible default title if none provided
    const docs = await db.document.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, name: true },
    });

    if (docs.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Documents not found" } },
        { status: 404 }
      );
    }

    const defaultTitle =
      result.data.title ||
      (docs.length === 1
        ? `Chat: ${docs[0].name.replace(/\.[^/.]+$/, "")}`
        : `Multi-doc: ${docs[0].name.slice(0, 15)} & ${docs.length - 1} more`);

    const conversation = await db.conversation.create({
      data: {
        title: defaultTitle,
        mode,
        documents: {
          create: documentIds.map((docId, idx) => ({
            documentId: docId,
            label: `D${idx + 1}`,
          })),
        },
      },
      include: {
        documents: {
          include: {
            document: {
              select: { id: true, name: true, status: true, pageCount: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        mode: conversation.mode,
        documents: conversation.documents.map((d) => ({
          ...d.document,
          label: d.label,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

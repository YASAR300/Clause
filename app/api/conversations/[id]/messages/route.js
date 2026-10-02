import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    const conversation = await db.conversation.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Conversation not found" } },
        { status: 404 }
      );
    }

    const messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      include: {
        citations: {
          orderBy: { ordinal: "asc" },
          include: {
            document: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const updateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(255, "Title is too long")
    .optional(),
  mode: z.enum(["STANDARD", "AGENT"]).optional(),
});

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        documents: {
          include: {
            document: {
              select: { id: true, name: true, status: true, pageCount: true, fullText: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            citations: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Conversation not found" } },
        { status: 404 }
      );
    }

    // Build a documentId → label map from the conversation's linked documents.
    const docLabelMap = new Map();
    for (const cd of conversation.documents) {
      if (cd.label) docLabelMap.set(cd.documentId, cd.label);
    }

    // Enrich each citation with the computed docLabel.
    const enrichedConversation = {
      ...conversation,
      messages: conversation.messages.map((msg) => ({
        ...msg,
        citations: (msg.citations || []).map((cite) => ({
          ...cite,
          docLabel: docLabelMap.get(cite.documentId) || null,
          documentName:
            conversation.documents.find((cd) => cd.documentId === cite.documentId)
              ?.document?.name || null,
        })),
      })),
    };

    return NextResponse.json({ conversation: enrichedConversation });
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
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.errors[0]?.message || "Invalid title",
          },
        },
        { status: 400 }
      );
    }

    const updateData = {};
    if (result.data.title !== undefined) updateData.title = result.data.title;
    if (result.data.mode !== undefined) updateData.mode = result.data.mode;

    const updated = await db.conversation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, conversation: updated });
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

    const conv = await db.conversation.findUnique({ where: { id } });
    if (!conv) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Conversation not found" } },
        { status: 404 }
      );
    }

    await db.conversation.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

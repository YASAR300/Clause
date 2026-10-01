import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [
      totalDocuments,
      documentsReady,
      questionsAsked,
      quotesVerified,
      totalCitations,
      comparisonsRun,
      recentDocuments,
      recentConversations,
    ] = await Promise.all([
      db.document.count(),
      db.document.count({ where: { status: "READY" } }),
      db.message.count({ where: { role: "USER" } }),
      db.citation.count({ where: { verified: true } }),
      db.citation.count(),
      db.comparison.count(),
      db.document.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          sizeBytes: true,
          pageCount: true,
          createdAt: true,
        },
      }),
      db.conversation.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: {
          documents: {
            include: {
              document: {
                select: { id: true, name: true },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { content: true, role: true },
          },
        },
      }),
    ]);

    const verifiedRate =
      totalCitations > 0
        ? Math.round((quotesVerified / totalCitations) * 100)
        : 100;

    // Build synthesized activity feed from real table rows
    const activities = [];

    for (const doc of recentDocuments) {
      activities.push({
        id: `act-doc-${doc.id}`,
        type: "UPLOAD",
        title: `Contract uploaded`,
        detail: doc.name,
        timestamp: doc.createdAt,
        link: `/documents?highlight=${doc.id}`,
      });
    }

    for (const chat of recentConversations) {
      activities.push({
        id: `act-chat-${chat.id}`,
        type: "QUESTION",
        title: `Question in ${chat.title}`,
        detail: chat.messages[0]?.content || "Conversation active",
        timestamp: chat.updatedAt,
        link: `/chats/${chat.id}`,
      });
    }

    // Sort activity feed newest first
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return NextResponse.json({
      stats: {
        documentsReady,
        totalDocuments,
        questionsAsked,
        quotesVerified,
        verifiedRate,
        comparisonsRun,
      },
      recentDocuments,
      recentConversations,
      activityFeed: activities.slice(0, 10),
      isEmpty: totalDocuments === 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "DASHBOARD_QUERY_FAILED",
          message: error.message || "Could not load dashboard statistics",
        },
      },
      { status: 500 }
    );
  }
}

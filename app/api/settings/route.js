import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Read AI provider config safely (never expose secrets)
    const rawBaseUrl = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
    let providerHost = "api.groq.com";
    try {
      const parsed = new URL(rawBaseUrl);
      providerHost = parsed.host;
    } catch {
      providerHost = rawBaseUrl.replace(/^https?:\/\//, "").split("/")[0] || "Unknown";
    }

    const aiModel = process.env.AI_MODEL || "llama-3.3-70b-versatile";

    // Query stats from database
    const [docAgg, docCount, convCount, citationCount, compCount] = await Promise.all([
      db.document.aggregate({
        _sum: { sizeBytes: true },
      }),
      db.document.count(),
      db.conversation.count(),
      db.citation.count(),
      db.comparison.count(),
    ]);

    const totalBytes = docAgg._sum.sizeBytes || 0;

    return NextResponse.json({
      ai: {
        providerHost,
        model: aiModel,
        status: "ONLINE",
      },
      storage: {
        totalBytes,
        documentCount: docCount,
        conversationCount: convCount,
        citationCount: citationCount,
        comparisonCount: compCount,
      },
      blobStorageConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "SETTINGS_FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

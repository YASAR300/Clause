import { z } from "zod";
import { db } from "@/lib/db";
import { streamChat, completeJson, getAiModel } from "@/lib/ai/client";
import { executeStrategy } from "@/lib/retrieval/strategy";
import {
  createCoverageObject,
  buildCoveragePrompt,
  guardAbsenceClaims,
  mergePageRanges,
} from "@/lib/retrieval";
import { buildAnswerMessages } from "@/lib/ai/prompts/answer";
import { CiteStreamParser } from "@/lib/ai/cite-parser";
import { findQuote } from "@/lib/verify/quotes";

export const runtime = "nodejs";
export const maxDuration = 300;

const chatRequestSchema = z.object({
  question: z.string().trim().min(1, "Question cannot be empty"),
  documentIds: z.array(z.string().uuid()).min(1, "At least one document must be selected"),
  conversationId: z.string().uuid().optional(),
  mode: z.enum(["STANDARD", "AGENT"]).default("STANDARD"),
});

/**
 * Combines coverage metrics across multiple documents into a unified coverage object.
 */
function mergeMultipleCoverages(docCoverages, totalDocs) {
  let totalChunks = 0;
  let chunksRead = 0;
  let totalPages = 0;
  const allPageRanges = [];
  const failedChunks = [];
  const emptyPages = [];
  const perDocument = {};

  let hasExhaustive = false;
  let hasRetrieval = false;
  let allComplete = true;

  for (const { docId, coverage, pageCount } of docCoverages) {
    totalChunks += coverage.totalChunks || 0;
    chunksRead += coverage.chunksRead || 0;
    totalPages += pageCount || coverage.totalPages || 1;
    allPageRanges.push(...(coverage.pagesRead || []));
    failedChunks.push(...(coverage.failedChunks || []));
    emptyPages.push(...(coverage.emptyPages || []));
    perDocument[docId] = coverage;

    if (coverage.mode === "exhaustive") hasExhaustive = true;
    if (coverage.mode === "retrieval") hasRetrieval = true;
    if (!coverage.complete) allComplete = false;
  }

  const mode = hasRetrieval
    ? "retrieval"
    : hasExhaustive
    ? "exhaustive"
    : "whole";

  return createCoverageObject({
    mode,
    totalChunks,
    chunksRead,
    pagesRead: mergePageRanges(allPageRanges),
    totalPages: Math.max(1, totalPages),
    complete: allComplete && mode !== "retrieval",
    failedChunks,
    emptyPages,
    perDocument,
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { code: "INVALID_JSON", message: "Invalid request payload" } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const validation = chatRequestSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error.errors[0]?.message || "Validation failed",
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { question, documentIds, mode } = validation.data;
  let conversationId = validation.data.conversationId;

  // 1. Resolve or create Conversation
  let isNewConversation = false;
  if (!conversationId) {
    isNewConversation = true;
    const initialTitle = question.length > 60 ? `${question.slice(0, 57)}...` : question;
    const conv = await db.conversation.create({
      data: {
        title: initialTitle,
        mode,
        documents: {
          create: documentIds.map((docId) => ({ documentId: docId })),
        },
      },
    });
    conversationId = conv.id;
  } else {
    // Verify conversation exists
    const existing = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { documents: true },
    });
    if (!existing) {
      return new Response(
        JSON.stringify({ error: { code: "NOT_FOUND", message: "Conversation not found" } }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. Persist USER message
  const userMessage = await db.message.create({
    data: {
      conversationId,
      role: "USER",
      content: question,
      status: "COMPLETE",
    },
  });

  // 3. Persist initial STREAMING ASSISTANT message
  const assistantMessage = await db.message.create({
    data: {
      conversationId,
      role: "ASSISTANT",
      content: "",
      status: "STREAMING",
    },
  });

  // 4. Load full document contexts & pages
  const documents = await db.document.findMany({
    where: { id: { in: documentIds } },
    include: {
      pages: {
        orderBy: { pageNumber: "asc" },
      },
    },
  });

  if (documents.length === 0) {
    await db.message.update({
      where: { id: assistantMessage.id },
      data: { status: "ERROR", content: "No documents available for analysis." },
    });
    return new Response(
      JSON.stringify({ error: { code: "NO_DOCUMENTS", message: "Selected documents not found" } }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Execute retrieval strategies across documents
  const docCoverages = [];
  const labeledDocs = [];
  const docMap = new Map(); // e.g. "D1" -> doc

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const docLabel = `D${i + 1}`;
    docMap.set(docLabel, doc);

    const stratResult = await executeStrategy({
      document: doc,
      question,
      signal: request.signal,
    });

    docCoverages.push({
      docId: doc.id,
      coverage: stratResult.coverage,
      pageCount: doc.pageCount || 1,
    });

    labeledDocs.push({
      id: doc.id,
      name: doc.name,
      contextText: stratResult.contextText,
    });
  }

  const combinedCoverage = mergeMultipleCoverages(docCoverages, documents.length);
  const coveragePrompt = buildCoveragePrompt(combinedCoverage);

  // 6. Fetch recent conversation history
  const recentMessages = await db.message.findMany({
    where: {
      conversationId,
      id: { notIn: [userMessage.id, assistantMessage.id] },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const formattedHistory = recentMessages
    .reverse()
    .map((m) => ({
      role: m.role.toLowerCase(),
      content: m.content,
    }));

  const aiMessages = buildAnswerMessages({
    question,
    documents: labeledDocs,
    coverageStatement: coveragePrompt,
    history: formattedHistory,
  });

  // 7. Initialize Server-Sent Events stream
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (eventType, eventData) => {
    try {
      const payload = `event: ${eventType}\ndata: ${JSON.stringify(eventData)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch {
      // Stream write aborted by client
    }
  };

  // Run generation and citation verification asynchronously
  (async () => {
    let cleanTextSoFar = "";
    let isStopped = false;
    let isNotFoundTriggered = false;
    const verifiedCitations = [];

    // Send initial events
    await sendEvent("conversation", {
      conversationId,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
    });

    await sendEvent("coverage", combinedCoverage);

    // Setup streaming cite parser
    const parser = new CiteStreamParser({
      onText: async (delta) => {
        cleanTextSoFar += delta;
        await sendEvent("token", { text: delta });
      },
      onCitation: async (rawCite) => {
        const targetDoc = docMap.get(rawCite.docId) || documents[0];
        const otherDocs = documents
          .filter((d) => d.id !== targetDoc.id)
          .map((d) => ({
            id: d.id,
            name: d.name,
            fullText: d.fullText,
            pages: d.pages,
          }));

        const verification = findQuote(
          targetDoc.fullText,
          targetDoc.pages || [],
          rawCite.quoteText,
          { otherDocuments: otherDocs }
        );

        const firstMatch = verification.matches[0] || {};
        const citationRecord = {
          messageId: assistantMessage.id,
          documentId: targetDoc.id,
          ordinal: rawCite.ordinal,
          quoteText: rawCite.quoteText,
          verified: verification.verified,
          matchCount: verification.matchCount,
          startOffset: firstMatch.start ?? 0,
          endOffset: firstMatch.end ?? 0,
          pageStart: firstMatch.pageStart ?? 1,
          pageEnd: firstMatch.pageEnd ?? 1,
          allMatches: verification.matches,
          failureReason: verification.reason,
        };

        // Persist citation row in DB immediately
        try {
          const savedCitation = await db.citation.create({
            data: citationRecord,
          });
          const enrichedCitation = {
            ...savedCitation,
            documentName: targetDoc.name,
          };
          verifiedCitations.push(enrichedCitation);
          await sendEvent("citation", enrichedCitation);
        } catch (dbErr) {
          console.error("Failed to save citation:", dbErr.message);
        }
      },
      onNotFound: async () => {
        isNotFoundTriggered = true;
        await sendEvent("notFound", { notFound: true });
      },
    });

    // Abort handler for STOP button / client disconnect
    request.signal?.addEventListener("abort", async () => {
      isStopped = true;
      const partialResult = parser.end();
      const partialContent = guardAbsenceClaims(
        partialResult.cleanText || cleanTextSoFar,
        combinedCoverage
      );

      try {
        await db.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: partialContent,
            status: "STOPPED",
            coverage: combinedCoverage,
          },
        });
      } catch {}

      try {
        await writer.close();
      } catch {}
    });

    try {
      // Stream tokens from AI model
      const stream = streamChat({
        messages: aiMessages,
        signal: request.signal,
      });

      for await (const chunk of stream) {
        if (isStopped || request.signal?.aborted) break;
        parser.feed(chunk);
      }

      if (!isStopped && !request.signal?.aborted) {
        const finalResult = parser.end();
        let finalContent = finalResult.cleanText || cleanTextSoFar;

        // Apply deterministic absence guardrail
        finalContent = guardAbsenceClaims(finalContent, combinedCoverage);

        // Update assistant message to COMPLETE
        await db.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: finalContent,
            status: "COMPLETE",
            coverage: combinedCoverage,
          },
        });

        // Touch conversation updated timestamp
        await db.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        // Send done event
        await sendEvent("done", {
          messageId: assistantMessage.id,
          content: finalContent,
          citations: verifiedCitations,
          coverage: combinedCoverage,
          isNotFound: isNotFoundTriggered,
        });

        // Asynchronously generate concise title for new conversations
        if (isNewConversation) {
          completeJson({
            messages: [
              {
                role: "system",
                content:
                  "Generate a concise 3 to 6 word title summarizing this legal contract question. Return JSON: {\"title\": \"string\"}",
              },
              { role: "user", content: `Question: "${question}"` },
            ],
            schema: z.object({ title: z.string() }),
            model: getAiModel(true),
          })
            .then((res) => {
              if (res?.title) {
                db.conversation.update({
                  where: { id: conversationId },
                  data: { title: res.title.trim().replace(/^["']|["']$/g, "") },
                }).catch(() => {});
              }
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      if (!isStopped) {
        const errorPayload = {
          code: err.code || "CHAT_ERROR",
          message:
            err.uiMessage ||
            err.message ||
            "An error occurred while generating contract answers.",
        };

        try {
          await db.message.update({
            where: { id: assistantMessage.id },
            data: {
              content: cleanTextSoFar,
              status: "ERROR",
              coverage: combinedCoverage,
            },
          });
        } catch {}

        await sendEvent("error", errorPayload);
      }
    } finally {
      try {
        await writer.close();
      } catch {}
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

import { env } from "@/lib/env";
import { batchChunks } from "./budget";
import { createCompletion } from "./client";
import {
  createCoverageTracker,
  recordChunkSuccess,
  recordChunkFailure,
} from "./coverage";

export async function mapExhaustiveChunks(
  chunks = [],
  question = "",
  options = {}
) {
  const concurrency = options.concurrency ?? env.AI_MAP_CONCURRENCY ?? 2;
  const maxContextChars =
    options.maxContextChars ?? env.AI_MAX_CONTEXT_CHARS ?? 12000;
  const coverage = createCoverageTracker(chunks.length);
  const batches = batchChunks(chunks, maxContextChars, 2000);
  const results = [];

  let batchIndex = 0;

  async function worker() {
    while (batchIndex < batches.length) {
      const currentIndex = batchIndex++;
      const batch = batches[currentIndex];
      const batchChunkIds = batch.map((c) => c.id || c.ordinal);

      const contractContext = batch
        .map(
          (c, idx) =>
            `[Section/Heading: ${c.heading || "Untitled"} | Ordinal: ${
              c.ordinal ?? idx
            }]\n${c.text}`
        )
        .join("\n\n---\n\n");

      const prompt = `You are analyzing a contract excerpt to answer a specific legal question.
Question: ${question}

Contract Excerpt:
${contractContext}

Extract any relevant facts, clauses, or provisions that help answer the question. If irrelevant, return empty findings.`;

      try {
        const response = await createCompletion(
          {
            messages: [
              {
                role: "system",
                content:
                  "You are an expert legal assistant. Extract relevant clauses accurately.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 600,
          },
          {
            onWait: options.onWait,
            useFast: true,
          }
        );

        const content = response.choices?.[0]?.message?.content || "";
        recordChunkSuccess(coverage, batchChunkIds);
        results.push({
          batchIndex: currentIndex,
          chunkIds: batchChunkIds,
          findings: content,
        });
      } catch (error) {
        recordChunkFailure(coverage, batchChunkIds, error);
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, batches.length || 1) },
    () => worker()
  );
  await Promise.all(workers);

  return {
    results,
    coverage,
  };
}

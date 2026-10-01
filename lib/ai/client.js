import OpenAI from "openai";
import { env } from "@/lib/env";
import { globalRateLimiter } from "./limiter";
import { estimateTokens } from "./budget";

let openaiClient = null;

export function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.AI_API_KEY,
      baseURL: env.AI_BASE_URL,
    });
  }
  return openaiClient;
}

export function getAiModel(useFast = false) {
  if (useFast && env.AI_FAST_MODEL) {
    return env.AI_FAST_MODEL;
  }
  return env.AI_MODEL;
}

export async function createCompletion(params, options = {}) {
  const client = getOpenAIClient();
  const inputChars = (params.messages || [])
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("");

  const estimatedInputTokens = estimateTokens(inputChars);
  const estimatedOutputTokens = params.max_tokens || 800;
  const totalEstimated = estimatedInputTokens + estimatedOutputTokens;

  return globalRateLimiter.execute(
    () =>
      client.chat.completions.create({
        model: params.model || getAiModel(options.useFast),
        ...params,
      }),
    {
      estimatedTokens: totalEstimated,
      onWait: options.onWait,
      maxRetries: options.maxRetries ?? 3,
    }
  );
}

export async function createStream(params, options = {}) {
  const client = getOpenAIClient();
  const inputChars = (params.messages || [])
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("");

  const estimatedInputTokens = estimateTokens(inputChars);
  const estimatedOutputTokens = params.max_tokens || 800;
  const totalEstimated = estimatedInputTokens + estimatedOutputTokens;

  return globalRateLimiter.execute(
    () =>
      client.chat.completions.create({
        model: params.model || getAiModel(options.useFast),
        stream: true,
        ...params,
      }),
    {
      estimatedTokens: totalEstimated,
      onWait: options.onWait,
      maxRetries: options.maxRetries ?? 3,
    }
  );
}

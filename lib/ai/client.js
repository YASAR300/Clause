import OpenAI from "openai";
import { env } from "@/lib/env";
import { globalRateLimiter } from "./limiter";
import { estimateTokens } from "./budget";

/**
 * Base AI Error
 */
export class AiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AiError";
    this.code = options.code || "AI_ERROR";
    this.status = options.status || 500;
    this.uiMessage = options.uiMessage || "An unexpected error occurred while communicating with the AI service.";
  }
}

/**
 * Thrown when the AI provider returns HTTP 429 or hits rate limits
 */
export class AiRateLimitError extends AiError {
  constructor(message = "AI service rate limit exceeded", options = {}) {
    super(message, {
      code: "AI_RATE_LIMIT",
      status: 429,
      uiMessage: "AI provider rate limit reached. Please wait a moment before trying again.",
      ...options,
    });
    this.name = "AiRateLimitError";
  }
}

/**
 * Thrown when an AI call times out or is aborted
 */
export class AiTimeoutError extends AiError {
  constructor(message = "AI request timed out", options = {}) {
    super(message, {
      code: "AI_TIMEOUT",
      status: 504,
      uiMessage: "The AI analysis timed out. The document section may be too dense or the provider is slow.",
      ...options,
    });
    this.name = "AiTimeoutError";
  }
}

/**
 * Thrown when AI configuration or credentials are missing
 */
export class AiConfigError extends AiError {
  constructor(message = "AI service configuration is incomplete", options = {}) {
    super(message, {
      code: "AI_CONFIG_ERROR",
      status: 500,
      uiMessage: "AI service credentials are not configured properly.",
      ...options,
    });
    this.name = "AiConfigError";
  }
}

let openaiClient = null;

export function getOpenAIClient() {
  if (!openaiClient) {
    if (!env.AI_API_KEY || !env.AI_BASE_URL) {
      throw new AiConfigError("AI_API_KEY and AI_BASE_URL must be configured");
    }
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

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new AiTimeoutError("Operation aborted"));
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new AiTimeoutError("Operation aborted"));
      },
      { once: true }
    );
  });
}

/**
 * Strips code fences and parses raw JSON string safely
 */
export function extractJsonString(raw) {
  if (typeof raw !== "string") return "";
  let cleaned = raw.trim();
  // Strip ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```$/, "");
  }
  return cleaned.trim();
}

/**
 * Executes an OpenAI API call with retries on 429 and 5xx, backoff with jitter,
 * and strict timeout/AbortSignal compliance.
 */
export async function executeAiCall(callFn, options = {}) {
  const {
    maxRetries = 3,
    signal,
    timeoutMs = 60000,
    retryDelayBase = 1000,
  } = options;

  let attempt = 0;

  while (attempt <= maxRetries) {
    if (signal?.aborted) {
      throw new AiTimeoutError("AI request was cancelled");
    }

    const timeoutController = new AbortController();
    const combinedSignal = signal
      ? AbortSignal.any
        ? AbortSignal.any([signal, timeoutController.signal])
        : signal
      : timeoutController.signal;

    const timeoutTimer = setTimeout(() => {
      timeoutController.abort(new Error("Request timeout"));
    }, timeoutMs);

    try {
      const result = await callFn(combinedSignal);
      clearTimeout(timeoutTimer);
      return result;
    } catch (err) {
      clearTimeout(timeoutTimer);

      if (signal?.aborted || err.name === "AbortError" || err.message?.includes("aborted")) {
        throw new AiTimeoutError(err.message || "AI request was aborted or timed out");
      }

      const status = err.status || err.statusCode;
      const isRateLimit = status === 429 || err.code === "rate_limit_exceeded";
      const isServerError = typeof status === "number" && status >= 500 && status < 600;

      if ((isRateLimit || isServerError) && attempt < maxRetries) {
        attempt++;
        const jitter = Math.random() * 400;
        const delay = Math.min(retryDelayBase * Math.pow(2, attempt) + jitter, 10000);
        await sleep(delay, signal);
        continue;
      }

      if (isRateLimit) {
        throw new AiRateLimitError(err.message);
      }

      throw new AiError(err.message || "Failed to communicate with AI model", {
        status: status || 500,
      });
    }
  }
}

/**
 * Streams chat completion text deltas as an async iterator.
 * @param {object} params
 * @param {Array} params.messages
 * @param {AbortSignal} [params.signal]
 * @param {string} [params.model]
 * @param {number} [params.temperature]
 * @param {number} [params.maxTokens]
 * @returns {AsyncGenerator<string>}
 */
export async function* streamChat({
  messages,
  signal,
  model,
  temperature = 0.2,
  maxTokens,
}) {
  const client = getOpenAIClient();
  const targetModel = model || getAiModel(false);

  const stream = await executeAiCall(
    (combinedSignal) =>
      client.chat.completions.create(
        {
          model: targetModel,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        },
        { signal: combinedSignal }
      ),
    { signal }
  );

  for await (const chunk of stream) {
    if (signal?.aborted) {
      throw new AiTimeoutError("Chat stream aborted");
    }
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}

/**
 * Requests JSON completion, strips markdown code fences, parses, and validates with zod.
 * Retries once with a repair instruction on validation or parse failure.
 */
export async function completeJson({
  messages,
  schema,
  signal,
  model,
  temperature = 0.1,
}) {
  const client = getOpenAIClient();
  const targetModel = model || getAiModel(true);

  const runRequest = async (msgs) => {
    const response = await executeAiCall(
      (combinedSignal) =>
        client.chat.completions.create(
          {
            model: targetModel,
            messages: msgs,
            temperature,
            response_format: { type: "json_object" },
          },
          { signal: combinedSignal }
        ),
      { signal }
    );
    return response.choices?.[0]?.message?.content || "";
  };

  const rawContent = await runRequest(messages);
  const parsedFirst = extractJsonString(rawContent);

  let data;
  let parseError = null;

  try {
    data = JSON.parse(parsedFirst);
  } catch (err) {
    parseError = err;
  }

  if (!parseError && schema) {
    const valResult = schema.safeParse(data);
    if (valResult.success) {
      return valResult.data;
    }
    parseError = new Error(valResult.error.message);
  } else if (!parseError) {
    return data;
  }

  // Repair retry: append error feedback and request valid JSON once
  const repairMessages = [
    ...messages,
    { role: "assistant", content: rawContent },
    {
      role: "user",
      content: `The previous response was invalid JSON or did not match the expected schema: ${parseError.message}. Please return ONLY valid JSON matching the exact schema with no extra commentary or markdown.`,
    },
  ];

  const repairedRaw = await runRequest(repairMessages);
  const cleanedRepair = extractJsonString(repairedRaw);

  try {
    const repairedData = JSON.parse(cleanedRepair);
    if (schema) {
      return schema.parse(repairedData);
    }
    return repairedData;
  } catch (finalErr) {
    throw new AiError(`Failed to parse or validate JSON response from AI: ${finalErr.message}`, {
      code: "AI_JSON_PARSE_ERROR",
      status: 422,
      uiMessage: "The AI service returned an unreadable response. Please retry.",
    });
  }
}

/**
 * Legacy rate-limited completion wrapper (maintained for backward compatibility)
 */
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

/**
 * Legacy rate-limited stream wrapper (maintained for backward compatibility)
 */
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

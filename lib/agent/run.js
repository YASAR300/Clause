import { getOpenAIClient, getAiModel, executeAiCall, AiTimeoutError } from "@/lib/ai/client";
import { AGENT_TOOLS } from "./tools";
import { generateHumanLabel, summarizeResult } from "./human-label";
import { buildAgentCoverage, guardAbsenceClaims } from "./coverage";
import { CiteStreamParser } from "@/lib/ai/cite-parser";
import { findQuote } from "@/lib/verify/quotes";

export const MAX_ROUNDS = 6;
export const MAX_TOOLS_PER_ROUND = 4;
export const MAX_TOTAL_TOOL_CALLS = 16;
export const MAX_TOOL_CHARS = 50000;
export const MAX_WALL_CLOCK_MS = 120000; // 2 minutes

const SYSTEM_PROMPT = `You are an elite legal contract researcher and analyst.
You have access to documents attached to the current conversation.
You MUST research the agreements by calling the available tools before producing your final answer.

Research Guidelines:
1. Always start by identifying which clauses or sections exist (using list_clauses or search_document).
2. Read the relevant clauses carefully (using get_section or get_pages).
3. If comparing multiple contracts (e.g. D1 and D2), check BOTH contracts for corresponding terms.
4. When you have sufficient evidence, provide a thorough, comparative final answer.
5. In your final answer, every factual claim MUST include an inline citation tag:
   <cite doc="D1">verbatim character-for-character text copied from retrieved contract text</cite>
6. Never invent citations, page numbers, or legal terms.
7. If research is cut short or a clause cannot be found after searching, state that clearly and honestly.`;

/**
 * Runs the multi-round agentic research loop.
 */
export async function runAgent({
  question,
  documents = [],
  history = [],
  signal,
  onEvent,
  model,
}) {
  const startTime = Date.now();
  const targetModel = model || getAiModel(false);
  const client = getOpenAIClient();

  // Build document lookup maps
  const docMap = new Map();
  for (const d of documents) {
    if (d.id) docMap.set(d.id.toLowerCase(), d);
    if (d.label) docMap.set(d.label.toLowerCase(), d);
  }

  // Tracking structures
  const readsByDoc = new Map();
  let allRetrievedText = "";

  const recordDocumentRead = (docId, info) => {
    if (!readsByDoc.has(docId)) {
      readsByDoc.set(docId, {
        pages: new Set(),
        chunks: new Set(),
        listedClauses: false,
        searchQueries: [],
        textRead: "",
      });
    }
    const record = readsByDoc.get(docId);
    if (info.mode === "list_clauses") {
      record.listedClauses = true;
    } else if (info.mode === "search") {
      if (info.query) record.searchQueries.push(info.query);
      if (info.chunkIds) info.chunkIds.forEach((id) => record.chunks.add(id));
      if (info.pageRanges) {
        info.pageRanges.forEach(([p1, p2]) => {
          for (let p = p1; p <= p2; p++) record.pages.add(p);
        });
      }
    } else if (info.mode === "section" || info.mode === "pages") {
      if (info.pageRanges) {
        info.pageRanges.forEach(([p1, p2]) => {
          for (let p = p1; p <= p2; p++) record.pages.add(p);
        });
      }
      if (info.fullTextChunk) {
        record.textRead += `\n${info.fullTextChunk}`;
        allRetrievedText += `\n${info.fullTextChunk}`;
      }
    }
  };

  const toolContext = {
    conversationDocuments: documents,
    recordDocumentRead,
  };

  // Build initial message list
  const docSummary = documents
    .map((d) => `- [${d.label || "D1"}] "${d.name}" (${d.pageCount || 1} pages, ID: ${d.id})`)
    .join("\n");

  const messages = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nAvailable Contracts:\n${docSummary}` },
    ...history.slice(-4),
    { role: "user", content: question },
  ];

  const toolTrace = [];
  const seenCallSignatures = new Set();

  let round = 0;
  let totalToolCalls = 0;
  let totalToolChars = 0;
  let consecutiveInvalidCalls = 0;
  let cutShort = false;
  let cutShortReason = "";
  let finalContent = "";
  let nativeToolsSupported = true;

  // Multi-round research loop
  while (round < MAX_ROUNDS) {
    if (signal?.aborted) {
      throw new AiTimeoutError("Agent run aborted by user");
    }

    round++;
    await onEvent?.("round_start", { round });

    // Check hard caps before model call
    const elapsedMs = Date.now() - startTime;
    if (round >= MAX_ROUNDS) {
      cutShort = true;
      cutShortReason = "Reached maximum round limit (6 rounds).";
    } else if (totalToolCalls >= MAX_TOTAL_TOOL_CALLS) {
      cutShort = true;
      cutShortReason = "Reached maximum total tool calls cap (16 calls).";
    } else if (totalToolChars >= MAX_TOOL_CHARS) {
      cutShort = true;
      cutShortReason = "Tool retrieval character budget exceeded.";
    } else if (elapsedMs >= MAX_WALL_CLOCK_MS) {
      cutShort = true;
      cutShortReason = "Research wall-clock timeout exceeded.";
    }

    if (cutShort || consecutiveInvalidCalls >= 3) {
      break;
    }

    // Call model with tools
    let choice;
    try {
      if (nativeToolsSupported) {
        const response = await executeAiCall(
          (combinedSignal) =>
            client.chat.completions.create(
              {
                model: targetModel,
                messages,
                tools: AGENT_TOOLS.map((t) => ({ type: t.type, function: t.function })),
                tool_choice: "auto",
                temperature: 0.1,
              },
              { signal: combinedSignal }
            ),
          { signal }
        );
        choice = response.choices?.[0]?.message;
      }
    } catch (modelErr) {
      // If model does not support native tools, fall back to JSON protocol
      if (modelErr.message?.includes("tools") || modelErr.message?.includes("function")) {
        nativeToolsSupported = false;
      } else {
        throw modelErr;
      }
    }

    // Fallback JSON protocol if native tools are unsupported
    if (!nativeToolsSupported) {
      const fallbackMsgs = [
        ...messages,
        {
          role: "system",
          content: `Return JSON only: either {"tool": "<tool_name>", "args": { ... }} or {"final": "<final markdown answer with <cite> tags>"}`,
        },
      ];
      const response = await executeAiCall(
        (combinedSignal) =>
          client.chat.completions.create(
            {
              model: targetModel,
              messages: fallbackMsgs,
              response_format: { type: "json_object" },
              temperature: 0.1,
            },
            { signal: combinedSignal }
          ),
        { signal }
      );
      try {
        const raw = response.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(raw);
        if (parsed.final) {
          finalContent = parsed.final;
          break;
        }
        if (parsed.tool) {
          choice = {
            role: "assistant",
            tool_calls: [
              {
                id: `call_${Date.now()}`,
                type: "function",
                function: {
                  name: parsed.tool,
                  arguments: JSON.stringify(parsed.args || {}),
                },
              },
            ],
          };
        }
      } catch {
        consecutiveInvalidCalls++;
      }
    }

    if (!choice) {
      consecutiveInvalidCalls++;
      continue;
    }

    // If the model did not request tool calls, it has finished research
    const rawToolCalls = choice.tool_calls;
    if (!rawToolCalls || rawToolCalls.length === 0) {
      finalContent = choice.content || "";
      break;
    }

    // Enforce max 4 tool calls per round
    const toolCallsToExecute = rawToolCalls.slice(0, MAX_TOOLS_PER_ROUND);

    // Append assistant's tool-calls message to history
    messages.push({
      role: "assistant",
      content: choice.content || null,
      tool_calls: choice.tool_calls,
    });

    // Execute each tool call
    for (const call of toolCallsToExecute) {
      if (signal?.aborted) {
        throw new AiTimeoutError("Agent run aborted during tool execution");
      }

      totalToolCalls++;
      const callId = call.id || `call_${Date.now()}_${Math.random()}`;
      const toolName = call.function?.name;
      let rawArgs = call.function?.arguments || "{}";

      let parsedArgs = {};
      let parseOk = true;
      try {
        parsedArgs = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
      } catch {
        parseOk = false;
      }

      const humanLabel = generateHumanLabel(toolName, parsedArgs, docMap);
      await onEvent?.("tool_start", {
        id: callId,
        name: toolName,
        humanLabel,
      });

      const toolDef = AGENT_TOOLS.find((t) => t.function.name === toolName);
      const toolStartMs = Date.now();
      let toolResult;
      let isOk = true;

      // Robustness validations
      if (!parseOk) {
        isOk = false;
        consecutiveInvalidCalls++;
        toolResult = { error: "invalid_json_arguments", message: "Arguments were not valid JSON" };
      } else if (!toolDef) {
        isOk = false;
        consecutiveInvalidCalls++;
        toolResult = {
          error: "unknown_tool",
          message: `Tool "${toolName}" does not exist.`,
          available: AGENT_TOOLS.map((t) => t.function.name),
        };
      } else {
        const val = toolDef.schema.safeParse(parsedArgs);
        if (!val.success) {
          isOk = false;
          consecutiveInvalidCalls++;
          toolResult = {
            error: "validation_error",
            message: val.error.errors.map((e) => e.message).join("; "),
          };
        } else {
          // Duplicate call check
          const callSig = `${toolName}:${JSON.stringify(val.data)}`;
          if (seenCallSignatures.has(callSig)) {
            isOk = false;
            toolResult = {
              error: "duplicate_call",
              message: "This exact query was already executed in a previous step.",
            };
          } else {
            seenCallSignatures.add(callSig);
            try {
              toolResult = await toolDef.handler(val.data, toolContext);
              if (toolResult?.error) {
                isOk = false;
                consecutiveInvalidCalls++;
              } else {
                consecutiveInvalidCalls = 0;
              }
            } catch (err) {
              isOk = false;
              consecutiveInvalidCalls++;
              toolResult = { error: "handler_exception", message: err.message || "Failed to execute tool" };
            }
          }
        }
      }

      const durationMs = Date.now() - toolStartMs;
      const summary = summarizeResult(toolName, toolResult, isOk);
      const resultString = JSON.stringify(toolResult);
      totalToolChars += resultString.length;

      // Emit tool_result event
      await onEvent?.("tool_result", {
        id: callId,
        summary,
        durationMs,
        ok: isOk,
      });

      // Persist in trace
      toolTrace.push({
        id: callId,
        name: toolName,
        humanLabel,
        args: parsedArgs,
        durationMs,
        ok: isOk,
        summary,
        result: toolResult,
      });

      // Append tool response message
      messages.push({
        role: "tool",
        tool_call_id: callId,
        content: resultString,
      });
    }
  }

  // Force final answer if stopped or cut short
  if (!finalContent) {
    const cutShortNotice = cutShort
      ? `Research was cut short (${cutShortReason}). Answer now using only the information already retrieved, state clearly that your research was cut short, and cite retrieved excerpts.`
      : consecutiveInvalidCalls >= 3
      ? "Three consecutive research steps failed. Answer now using only the information retrieved, and note this limitation."
      : "Synthesize your final comparative answer now using only retrieved excerpts with <cite doc='...'> tags.";

    messages.push({
      role: "user",
      content: cutShortNotice,
    });

    const finalResponse = await executeAiCall(
      (combinedSignal) =>
        client.chat.completions.create(
          {
            model: targetModel,
            messages,
            temperature: 0.2,
          },
          { signal: combinedSignal }
        ),
      { signal }
    );
    finalContent = finalResponse.choices?.[0]?.message?.content || "";
  }

  // Build dynamic coverage object
  const coverage = buildAgentCoverage(documents, readsByDoc, cutShort);

  return {
    rawContent: finalContent,
    toolTrace,
    coverage,
    allRetrievedText,
    cutShort,
  };
}

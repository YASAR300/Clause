"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

/**
 * Custom hook to stream chat completions with real-time verified citations,
 * Server-Sent Events (SSE), abort support, and reconnection-safe state.
 */
export function useChatStream({ conversationId: initialConversationId, initialMessages = [] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
  }, []);

  const sendMessage = useCallback(
    async ({ question, documentIds, mode = "STANDARD" }) => {
      if (!question || !question.trim()) return;
      if (!documentIds || documentIds.length === 0) {
        toast.error("Please select at least one document for this conversation.");
        return;
      }

      setError(null);
      setIsStreaming(true);

      const userTempId = `temp-user-${Date.now()}`;
      const assistantTempId = `temp-assistant-${Date.now()}`;

      // Optimistically add user and empty assistant messages
      const newUserMsg = {
        id: userTempId,
        role: "USER",
        content: question.trim(),
        createdAt: new Date().toISOString(),
      };

      const newAssistantMsg = {
        id: assistantTempId,
        role: "ASSISTANT",
        content: "",
        status: "STREAMING",
        citations: [],
        coverage: null,
        isNotFound: false,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newUserMsg, newAssistantMsg]);
      setStreamingMessageId(assistantTempId);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: question.trim(),
            documentIds,
            conversationId,
            mode,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP ${response.status}: Request failed`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        let currentAssistantId = assistantTempId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            if (!part.trim()) continue;

            const lines = part.split("\n");
            let eventType = "message";
            let dataStr = "";

            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.replace("event:", "").trim();
              } else if (line.startsWith("data:")) {
                dataStr = line.replace("data:", "").trim();
              }
            }

            if (!dataStr) continue;

            let data;
            try {
              data = JSON.parse(dataStr);
            } catch {
              continue;
            }

            if (eventType === "conversation") {
              if (data.conversationId) {
                setConversationId(data.conversationId);
              }
              if (data.assistantMessageId) {
                currentAssistantId = data.assistantMessageId;
                setStreamingMessageId(data.assistantMessageId);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantTempId
                      ? { ...m, id: data.assistantMessageId }
                      : m.id === userTempId && data.userMessageId
                      ? { ...m, id: data.userMessageId }
                      : m
                  )
                );
              }
            } else if (eventType === "round_start") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAssistantId
                    ? { ...m, activeRound: data.round }
                    : m
                )
              );
            } else if (eventType === "tool_start") {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== currentAssistantId) return m;
                  const trace = m.toolTrace || [];
                  const existingIdx = trace.findIndex((t) => t.id === data.id);
                  if (existingIdx >= 0) {
                    const updated = [...trace];
                    updated[existingIdx] = { ...updated[existingIdx], ...data };
                    return { ...m, toolTrace: updated };
                  }
                  return { ...m, toolTrace: [...trace, data] };
                })
              );
            } else if (eventType === "tool_result") {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== currentAssistantId) return m;
                  const trace = m.toolTrace || [];
                  const updated = trace.map((t) =>
                    t.id === data.id ? { ...t, ...data } : t
                  );
                  return { ...m, toolTrace: updated };
                })
              );
            } else if (eventType === "coverage") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAssistantId
                    ? { ...m, coverage: data }
                    : m
                )
              );
            } else if (eventType === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAssistantId
                    ? { ...m, content: (m.content || "") + (data.text || "") }
                    : m
                )
              );
            } else if (eventType === "citation") {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== currentAssistantId) return m;
                  const existing = m.citations || [];
                  // Dedupe by ordinal
                  if (existing.some((c) => c.ordinal === data.ordinal)) {
                    return m;
                  }
                  return {
                    ...m,
                    citations: [...existing, data],
                  };
                })
              );
            } else if (eventType === "notFound") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAssistantId
                    ? { ...m, isNotFound: true }
                    : m
                )
              );
            } else if (eventType === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAssistantId
                    ? {
                        ...m,
                        content: data.content || m.content,
                        status: "COMPLETE",
                        citations: data.citations || m.citations,
                        coverage: data.coverage || m.coverage,
                        toolTrace: data.toolTrace || m.toolTrace,
                        isNotFound: data.isNotFound || m.isNotFound,
                      }
                    : m
                )
              );
              setIsStreaming(false);
              setStreamingMessageId(null);
            } else if (eventType === "error") {
              throw new Error(data.message || "Chat generation error");
            }
          }
        }
      } catch (err) {
        if (err.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantTempId || m.id === streamingMessageId
                ? { ...m, status: "STOPPED" }
                : m
            )
          );
        } else {
          setError(err.message);
          toast.error(err.message || "Failed to generate answer");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantTempId || m.id === streamingMessageId
                ? { ...m, status: "ERROR" }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        setStreamingMessageId(null);
        abortControllerRef.current = null;
      }
    },
    [conversationId, streamingMessageId]
  );

  return {
    messages,
    setMessages,
    conversationId,
    setConversationId,
    isStreaming,
    streamingMessageId,
    error,
    sendMessage,
    stop,
  };
}

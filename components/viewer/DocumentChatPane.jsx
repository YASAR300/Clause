"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { MessageSquare, Bot, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { getDocumentAuditQueries } from "@/lib/ai/suggestions";
import { useChatStream } from "@/lib/hooks/useChatStream";
import { MessageList } from "@/components/chat/MessageList";
import { ChatComposer } from "@/components/chat/ChatComposer";

const fetcher = (url) => fetch(url).then((res) => res.json());

/**
 * Chat companion pane inside the resizable Document Viewer layout.
 * Shows conversation history for this document and triggers viewer citation highlights.
 */
export function DocumentChatPane({
  documentId,
  documentName,
  document,
  isDocumentReady = true,
  onSelectCitation,
}) {
  const dynamicSuggestions = useMemo(() => {
    return getDocumentAuditQueries(document || { name: documentName });
  }, [document, documentName]);

  // Check for conversation linked to this document
  const { data: convData, mutate: mutateConv } = useSWR(
    documentId ? `/api/conversations?documentId=${documentId}` : null,
    fetcher
  );

  const existingConversation = convData?.conversations?.[0];
  const [conversationId, setConversationId] = useState(existingConversation?.id || null);

  useEffect(() => {
    if (existingConversation?.id && !conversationId) {
      setConversationId(existingConversation.id);
    }
  }, [existingConversation, conversationId]);

  // Fetch conversation messages
  const { data: messagesData } = useSWR(
    conversationId ? `/api/conversations/${conversationId}/messages` : null,
    fetcher
  );

  const initialMessages = messagesData?.messages || [];

  const {
    messages,
    setMessages,
    isStreaming,
    streamingMessageId,
    sendMessage,
    stop,
  } = useChatStream({
    conversationId,
    initialMessages,
  });

  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  const [isDeepResearch, setIsDeepResearch] = useState(
    existingConversation?.mode === "AGENT"
  );

  useEffect(() => {
    if (existingConversation?.mode === "AGENT") {
      setIsDeepResearch(true);
    }
  }, [existingConversation?.mode]);

  const handleToggleDeepResearch = async (nextVal) => {
    setIsDeepResearch(nextVal);
    if (conversationId) {
      try {
        await fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: nextVal ? "AGENT" : "STANDARD" }),
        });
      } catch (e) {}
    }
  };

  const handleSend = async (question, explicitDocIds, explicitMode) => {
    let activeConvId = conversationId;
    const modeToSend = explicitMode || (isDeepResearch ? "AGENT" : "STANDARD");

    // Create conversation on first question if not existing
    if (!activeConvId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Q&A: ${documentName.slice(0, 32)}`,
            documentIds: [documentId],
            mode: modeToSend,
          }),
        });
        const json = await res.json();
        if (json.conversation?.id) {
          activeConvId = json.conversation.id;
          setConversationId(activeConvId);
          mutateConv();
        }
      } catch (err) {
        console.warn("Failed to create conversation for document:", err);
      }
    }

    sendMessage({
      question,
      documentIds: [documentId],
      mode: modeToSend,
      conversationId: activeConvId,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e] border-l border-[#222226] overflow-hidden">
      {/* Pane Subheader */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#222226] bg-[#121215]/80 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-[#3b82f6]" />
          <span className="text-xs font-semibold text-[#ededed]">Contract Assistant</span>
        </div>
        <span className="text-[10px] font-mono text-[#71717a] bg-[#18181b] px-1.5 py-0.5 rounded border border-[#27272a]">
          Ground Truth
        </span>
      </div>

      {/* Message Stream or Empty State */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center p-4 space-y-4 overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="mx-auto h-9 w-9 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[#3b82f6]">
                <Bot className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-semibold text-[#ededed]">
                  Contract-Tailored Audit Queries
                </h3>
                <p className="text-[11px] text-[#71717a]">
                  Click to run a word-for-word check verified against exact character offsets.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              {dynamicSuggestions.slice(0, 3).map((item, idx) => {
                const Icon = item.icon || Sparkles;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(item.prompt)}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-lg bg-[#121215] hover:bg-[#18181c] border border-[#222226] hover:border-[#3b82f6]/40 text-left transition-all group"
                  >
                    <div className="h-6 w-6 rounded bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0 text-[#71717a] group-hover:text-[#3b82f6] transition-colors mt-0.5">
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#ededed] group-hover:text-[#3b82f6] transition-colors truncate">
                          {item.title}
                        </span>
                        <ChevronRight className="h-3 w-3 text-[#52525b] group-hover:text-[#3b82f6] shrink-0" />
                      </div>
                      <p className="text-[10px] text-[#71717a] truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingMessageId={streamingMessageId}
            onRetry={(msg) => handleSend(msg.content)}
            onInspect={onSelectCitation}
          />
        )}
      </div>

      {/* Composer */}
      <div className="p-3 bg-[#0c0c0e] border-t border-[#222226] shrink-0">
        <ChatComposer
          onSend={handleSend}
          onStop={stop}
          isStreaming={isStreaming}
          disabled={!isDocumentReady}
          disabledReason={!isDocumentReady ? "Contract indexing in progress..." : ""}
          showSuggestions={messages.length > 0}
          suggestions={dynamicSuggestions}
          isDeepResearch={isDeepResearch}
          onToggleDeepResearch={handleToggleDeepResearch}
        />
      </div>
    </div>
  );
}

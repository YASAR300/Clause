"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { MessageSquare, Bot, Loader2, Sparkles } from "lucide-react";
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
  isDocumentReady = true,
  onSelectCitation,
}) {
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

  const handleSend = async (question) => {
    let activeConvId = conversationId;

    // Create conversation on first question if not existing
    if (!activeConvId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Q&A: ${documentName.slice(0, 32)}`,
            documentIds: [documentId],
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
      mode: "STANDARD",
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
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="h-10 w-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[#3b82f6]">
              <Bot className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h3 className="text-xs font-semibold text-[#ededed]">
                Ask questions about this agreement
              </h3>
              <p className="text-[11px] text-[#71717a] leading-relaxed">
                Click any citation in the answer to automatically highlight the exact passage in the contract.
              </p>
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
          showSuggestions={messages.length === 0}
        />
      </div>
    </div>
  );
}

"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  FileText,
  MessageSquare,
  ArrowLeft,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  Sparkles,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { useChatStream } from "@/lib/hooks/useChatStream";
import { MessageList } from "@/components/chat/MessageList";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ConversationDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const conversationId = resolvedParams.id;

  const { data, error, isLoading, mutate } = useSWR(
    conversationId ? `/api/conversations/${conversationId}` : null,
    fetcher
  );

  const conversation = data?.conversation;
  const initialMessages = conversation?.messages || [];
  const linkedDocs = conversation?.documents?.map((d) => d.document) || [];

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

  // Keep messages in sync when loaded from database
  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Dialog states for rename and delete
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStartRename = () => {
    setRenameValue(conversation?.title || "");
    setShowRenameDialog(true);
  };

  const handleConfirmRename = async (e) => {
    e.preventDefault();
    if (!renameValue.trim()) return;

    try {
      setIsRenaming(true);
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() }),
      });

      if (!res.ok) throw new Error("Failed to rename conversation");

      toast.success("Conversation renamed");
      setShowRenameDialog(false);
      mutate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteConversation = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete conversation");

      toast.success("Conversation deleted");
      router.push("/chats");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if all linked documents are in READY status
  const unreadyDoc = linkedDocs.find((d) => d.status !== "READY");
  const isDocumentUnready = Boolean(unreadyDoc);
  const unreadyReason = unreadyDoc
    ? `Contract "${unreadyDoc.name}" is currently ${unreadyDoc.status}. Please wait until indexing completes.`
    : "";

  const documentIds = linkedDocs.map((d) => d.id);

  const handleSendQuestion = (questionText) => {
    sendMessage({
      question: questionText,
      documentIds,
      mode: conversation?.mode || "STANDARD",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6] mb-3" />
        <p className="text-xs text-[#71717a]">Loading conversation and contract citations...</p>
      </div>
    );
  }

  if (error || (!isLoading && !conversation)) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-xs text-[#ef4444]">
          {error?.message || "Conversation not found or could not be loaded."}
        </p>
        <Button size="sm" variant="outline" asChild>
          <Link href="/chats">Back to Conversations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto w-full">
      {/* Top Bar Header */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#27272a] bg-[#0a0a0c]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Link
            href="/chats"
            className="p-1 rounded-md text-[#71717a] hover:text-[#ededed] hover:bg-[#18181b] transition-colors shrink-0"
            aria-label="Back to conversations list"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm text-[#ededed] truncate">
                {conversation.title}
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-[#27272a] text-[#71717a] shrink-0 hidden sm:inline-flex"
              >
                {conversation.mode === "AGENT" ? "Agent Mode" : "Ground Truth"}
              </Badge>
            </div>

            {/* Linked documents chips */}
            <div className="flex items-center gap-2 mt-0.5 overflow-x-auto text-[11px] text-[#71717a]">
              <span className="shrink-0">Contracts:</span>
              {linkedDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents?id=${doc.id}`}
                  className="inline-flex items-center gap-1 text-[#a1a1aa] hover:text-[#3b82f6] transition-colors truncate max-w-[200px]"
                >
                  <FileText className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{doc.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Conversation Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#71717a] hover:text-[#ededed]"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-[#121214] border-[#27272a]">
            <DropdownMenuItem
              onClick={handleStartRename}
              className="gap-2 text-xs text-[#ededed] cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Rename thread
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#27272a]" />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2 text-xs text-[#ef4444] hover:text-[#ef4444] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete thread
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Message Stream */}
      <div className="flex-1 min-h-0 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="h-10 w-10 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[#3b82f6]">
              <Bot className="h-5 w-5" />
            </div>

            <div className="space-y-1 max-w-md">
              <h3 className="text-sm font-semibold text-[#ededed]">
                Ask questions with word-for-word citations
              </h3>
              <p className="text-xs text-[#71717a] leading-relaxed">
                Every factual claim is cross-verified against exact character offsets in the selected contracts.
              </p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingMessageId={streamingMessageId}
            onRetry={(failedMsg) => handleSendQuestion(failedMsg.content)}
          />
        )}
      </div>

      {/* Composer Container */}
      <div className="p-4 bg-[#0a0a0c]/90 backdrop-blur-md border-t border-[#27272a] shrink-0">
        <ChatComposer
          onSend={handleSendQuestion}
          onStop={stop}
          isStreaming={isStreaming}
          disabled={isDocumentUnready}
          disabledReason={unreadyReason}
          showSuggestions={messages.length === 0}
        />
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md bg-[#121214] border-[#27272a] text-[#ededed]">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription className="text-xs text-[#71717a]">
              Give this conversation thread a descriptive title.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmRename} className="space-y-4 pt-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="e.g. Termination and Notice Clauses"
              className="bg-[#18181b] border-[#27272a] text-[#ededed] text-xs h-9"
              autoFocus
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRenameDialog(false)}
                className="h-8 text-xs border-[#27272a]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isRenaming || !renameValue.trim()}
                className="h-8 text-xs bg-[#3b82f6] hover:bg-[#2563eb]"
              >
                {isRenaming ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete conversation?"
        description="This will permanently delete this conversation and all verified citations recorded in this thread. This action cannot be undone."
        confirmLabel="Delete conversation"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConversation}
      />
    </div>
  );
}

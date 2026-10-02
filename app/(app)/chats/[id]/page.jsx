"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  FileText,
  ArrowLeft,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  Sparkles,
  Bot,
  Download,
  Copy,
  Check,
  ShieldCheck,
  SearchCode,
  RotateCcw,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { getDocumentAuditQueries } from "@/lib/ai/suggestions";
import { useChatStream } from "@/lib/hooks/useChatStream";
import { MessageList } from "@/components/chat/MessageList";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { CitationInspector } from "@/components/chat/CitationInspector";
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

  const dynamicSuggestions = useMemo(() => {
    return getDocumentAuditQueries(linkedDocs);
  }, [linkedDocs]);

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

  // Active citation inspected in side panel
  const [activeCitation, setActiveCitation] = useState(null);

  // Collect all citations across all messages in order for inspector prev/next
  const allCitations = useMemo(() => {
    const list = [];
    for (const msg of messages) {
      if (msg.citations && Array.isArray(msg.citations)) {
        for (const c of msg.citations) {
          list.push(c);
        }
      }
    }
    return list;
  }, [messages]);

  // Dialog states for rename and delete
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dialog for exporting audit report
  const [showExportModal, setShowExportModal] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);

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

  // Generate markdown audit report
  const generateAuditReport = () => {
    const timestamp = new Date().toISOString();
    const docNames = linkedDocs.map((d) => d.name).join(", ") || "Untitled Contract";
    let md = `# Clause Contract Audit Report\n\n`;
    md += `**Thread Title:** ${conversation?.title || "Inquiry"}\n`;
    md += `**Date:** ${timestamp}\n`;
    md += `**Contracts Examined:** ${docNames}\n`;
    md += `**Audit Standard:** Word-for-Word Character Offset Verification\n\n`;
    md += `---\n\n`;

    messages.forEach((msg, idx) => {
      if (msg.role === "USER") {
        md += `### Q: ${msg.content}\n\n`;
      } else {
        md += `#### Findings:\n${msg.content}\n\n`;
        if (msg.citations && msg.citations.length > 0) {
          md += `| Citation | Verbatim Quote | Page | Offsets | Verified |\n`;
          md += `|---|---|---|---|---|\n`;
          msg.citations.forEach((c) => {
            const pageStr = c.pageStart === c.pageEnd ? `p. ${c.pageStart}` : `pp. ${c.pageStart}-${c.pageEnd}`;
            const offsetStr = c.startOffset !== undefined ? `${c.startOffset} - ${c.endOffset}` : "N/A";
            const quoteEscaped = (c.quoteText || "").replace(/\|/g, "\\|");
            md += `| [${c.ordinal}] | "${quoteEscaped}" | ${pageStr} | ${offsetStr} | ${c.verified ? "Yes" : "No"} |\n`;
          });
          md += `\n`;
        }
        md += `---\n\n`;
      }
    });

    return md;
  };

  const handleCopyReport = async () => {
    try {
      const text = generateAuditReport();
      await navigator.clipboard.writeText(text);
      setReportCopied(true);
      toast.success("Audit report copied as Markdown");
      setTimeout(() => setReportCopied(false), 2000);
    } catch {
      toast.error("Failed to copy report");
    }
  };

  const handleDownloadReport = () => {
    try {
      const text = generateAuditReport();
      const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-report-${conversationId.slice(0, 8)}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Audit report downloaded");
      setShowExportModal(false);
    } catch {
      toast.error("Failed to download report");
    }
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
    <div className="flex flex-1 min-h-0 h-full w-full overflow-hidden bg-[#09090b]">
      {/* Main Chat Workspace Column */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar Header */}
        <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#222226] bg-[#0c0c0e]/90 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/chats"
              className="p-1.5 rounded-lg text-[#71717a] hover:text-[#ededed] hover:bg-[#18181b] transition-colors shrink-0"
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
                <span className="shrink-0 text-[#52525b]">Contract:</span>
                {linkedDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents?id=${doc.id}`}
                    className="inline-flex items-center gap-1 text-[#a1a1aa] hover:text-[#3b82f6] transition-colors truncate max-w-[220px]"
                  >
                    <FileText className="h-3 w-3 shrink-0 text-[#3b82f6]" />
                    <span className="truncate">{doc.name}</span>
                    {doc.pageCount && (
                      <span className="text-[10px] text-[#71717a] font-mono shrink-0">
                        ({doc.pageCount} p.)
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {allCitations.length > 0 && !activeCitation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveCitation(allCitations[0])}
                className="hidden md:inline-flex h-7 px-2.5 text-xs font-medium border-[#27272a] text-[#ededed] hover:bg-[#18181b] gap-1.5"
              >
                <SearchCode className="h-3.5 w-3.5 text-[#3b82f6]" />
                Inspect Citations ({allCitations.length})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="h-7 px-2 text-xs border-[#27272a] text-[#a1a1aa] hover:text-[#ededed] hover:bg-[#18181b] gap-1"
              title="Export verified audit report"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            {/* Conversation Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-[#71717a] hover:text-[#ededed]"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#121215] border-[#27272a]">
                <DropdownMenuItem
                  onClick={handleStartRename}
                  className="gap-2 text-xs text-[#ededed] cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Rename conversation
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowExportModal(true)}
                  className="gap-2 text-xs text-[#ededed] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#3b82f6]" />
                  Export Audit Report (.md)
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#27272a]" />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-xs text-[#ef4444] hover:text-[#ef4444] cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Message Stream or Interactive Empty Launchpad */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center max-w-3xl mx-auto w-full space-y-6">
              {/* Document Overview Card */}
              {linkedDocs.length > 0 && (
                <div className="w-full p-4 rounded-xl bg-[#121215] border border-[#222226] flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[#3b82f6] shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#ededed] truncate">
                        {linkedDocs[0]?.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#71717a] font-mono">
                        <span>{linkedDocs[0]?.pageCount || 1} pages</span>
                        <span>•</span>
                        <span className="text-[#10b981] flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          100% Text Indexed
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/documents?id=${linkedDocs[0]?.id}`}
                    className="p-1.5 rounded-lg text-[#71717a] hover:text-[#ededed] hover:bg-[#18181b] transition-colors shrink-0"
                    title="Open in contract viewer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {/* Trust Badge Banner */}
              <div className="w-full p-3 rounded-lg bg-[#10b981]/5 border border-[#10b981]/20 flex items-center gap-2.5 text-xs text-[#a1a1aa]">
                <ShieldCheck className="h-4 w-4 text-[#10b981] shrink-0" />
                <span className="text-[11px]">
                  <strong className="text-[#ededed] font-medium">Ground Truth Engine: </strong>
                  Every assertion is cross-verified against verbatim character offsets in your contracts. No hallucinations.
                </span>
              </div>

              {/* Starter Query Cards Grid */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
                    <Sparkles className="h-3 w-3 text-[#3b82f6]" />
                    <span>Document-Specific Audit Queries</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#52525b]">
                    Tailored to content
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dynamicSuggestions.map((card, idx) => {
                    const Icon = card.icon || Sparkles;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendQuestion(card.prompt)}
                        className="group flex items-start gap-3 p-3.5 rounded-xl bg-[#121215] hover:bg-[#16161a] border border-[#222226] hover:border-[#3b82f6]/40 text-left transition-all shadow-sm active:scale-[0.99]"
                      >
                        <div className="h-8 w-8 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0 text-[#71717a] group-hover:text-[#3b82f6] group-hover:border-[#3b82f6]/40 transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-[#ededed] group-hover:text-[#3b82f6] transition-colors">
                              {card.title}
                            </h4>
                            <ChevronRight className="h-3.5 w-3.5 text-[#52525b] group-hover:text-[#3b82f6] transition-colors" />
                          </div>
                          <p className="text-[11px] text-[#71717a] leading-relaxed mt-0.5 line-clamp-2">
                            {card.description}
                          </p>
                          {card.tag && (
                            <span className="inline-block mt-1.5 text-[9px] font-mono text-[#3b82f6] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded border border-[#3b82f6]/20">
                              {card.tag}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              streamingMessageId={streamingMessageId}
              onRetry={(failedMsg) => handleSendQuestion(failedMsg.content)}
              onInspect={(citation) => setActiveCitation(citation)}
            />
          )}
        </div>

        {/* Composer Container */}
        <div className="p-4 bg-[#0c0c0e]/95 backdrop-blur-md border-t border-[#222226] shrink-0 z-20">
          <div className="max-w-4xl mx-auto w-full">
            <ChatComposer
              onSend={handleSendQuestion}
              onStop={stop}
              isStreaming={isStreaming}
              disabled={isDocumentUnready}
              disabledReason={unreadyReason}
              showSuggestions={messages.length > 0}
              suggestions={dynamicSuggestions}
            />
          </div>
        </div>
      </div>

      {/* Companion Citation Inspector Side Drawer */}
      {activeCitation && (
        <CitationInspector
          citation={activeCitation}
          allCitations={allCitations}
          onClose={() => setActiveCitation(null)}
          onSelectCitation={(newCitation) => setActiveCitation(newCitation)}
          documentDetails={linkedDocs.find((d) => d.id === activeCitation.documentId)}
        />
      )}

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md bg-[#121215] border-[#27272a] text-[#ededed]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Rename conversation</DialogTitle>
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

      {/* Export Audit Report Dialog */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-xl bg-[#121215] border-[#27272a] text-[#ededed]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Download className="h-4 w-4 text-[#3b82f6]" />
              Export Contract Audit Report
            </DialogTitle>
            <DialogDescription className="text-xs text-[#71717a]">
              Download or copy an audit-ready Markdown report complete with verbatim quotes, character offsets, and verification statuses.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            <div className="p-3 rounded-lg bg-[#0e0e11] border border-[#222226] font-mono text-[11px] text-[#a1a1aa] max-h-56 overflow-y-auto whitespace-pre leading-relaxed">
              {generateAuditReport()}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyReport}
              className="h-8 text-xs border-[#27272a] gap-1.5"
            >
              {reportCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#10b981]" />
                  <span className="text-[#10b981]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadReport}
              className="h-8 text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download .md
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

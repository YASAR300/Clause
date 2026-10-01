"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  MessageSquare,
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Bot,
  ExternalLink,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { RelativeTime } from "@/components/app/RelativeTime";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ChatsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Dialogs
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // SWR queries
  const { data, error, isLoading, mutate } = useSWR(
    `/api/conversations${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    fetcher
  );

  const { data: docsData } = useSWR(
    showNewChatModal ? "/api/documents?status=READY&limit=50" : null,
    fetcher
  );

  const conversations = data?.conversations || [];

  // Actions
  const handleStartRename = (conv) => {
    setRenameTarget(conv);
    setRenameValue(conv.title);
  };

  const handleConfirmRename = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    try {
      setIsRenaming(true);
      const res = await fetch(`/api/conversations/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || "Failed to rename conversation");
      }
      toast.success("Conversation renamed");
      setRenameTarget(null);
      mutate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/conversations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || "Failed to delete conversation");
      }
      toast.success("Conversation deleted");
      setDeleteTarget(null);
      mutate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateNewChat = async () => {
    if (selectedDocIds.length === 0) return;

    try {
      setIsStartingChat(true);
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selectedDocIds }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || "Failed to create conversation");
      }
      setShowNewChatModal(false);
      setSelectedDocIds([]);
      toast.success("Chat initialized");
      router.push(`/chats?id=${resData.conversation.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsStartingChat(false);
    }
  };

  const toggleSelectDoc = (id) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        breadcrumbs={[{ label: "Clause", href: "/dashboard" }, { label: "Chats" }]}
        title="Conversations"
        description="Verifiable Q&A threads backed by offset-anchored citations."
        actions={
          <Button
            size="sm"
            onClick={() => setShowNewChatModal(true)}
            className="h-8 gap-1.5 text-xs bg-accent hover:bg-accent-hover text-white shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </Button>
        }
      />

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-3 p-2 bg-surface/50 border border-border rounded-lg max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <Input
            type="search"
            placeholder="Search conversations by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-bg/50 border-border focus:border-accent/40"
          />
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto mb-2" />
          <p className="text-xs text-muted">Loading conversations...</p>
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          title={search ? "No matching conversations" : "No conversations yet"}
          description={
            search
              ? `No conversations match "${search}". Try another query.`
              : "Start a conversation with one or more contracts to ask questions with ground-truth citations."
          }
          primaryAction={
            search
              ? { label: "Clear search", onClick: () => setSearch("") }
              : { label: "Start your first chat", onClick: () => setShowNewChatModal(true) }
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-surface divide-y divide-border/60 overflow-hidden">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-surface-hover/50 transition-colors gap-3"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 text-muted group-hover:text-accent group-hover:border-accent/30 transition-colors">
                  {conv.mode === "AGENT" ? (
                    <Bot className="h-4 w-4 text-accent" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link
                      href={`/chats?id=${conv.id}`}
                      className="font-medium text-xs sm:text-sm text-text hover:text-accent transition-colors truncate"
                    >
                      {conv.title}
                    </Link>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono px-1.5 py-0 ${
                        conv.mode === "AGENT"
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-border text-muted"
                      }`}
                    >
                      {conv.mode === "AGENT" ? "Agent" : "Standard"}
                    </Badge>
                  </div>

                  {/* Documents involved */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {conv.documents.map((doc) => (
                      <span
                        key={doc.id}
                        className="inline-flex items-center gap-1 text-[11px] text-muted bg-bg/60 border border-border rounded px-1.5 py-0.5 truncate max-w-[200px]"
                        title={doc.name}
                      >
                        <FileText className="h-3 w-3 text-muted/80 shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </span>
                    ))}
                    {conv.documents.length === 0 && (
                      <span className="text-[11px] text-muted italic">No attached documents</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right metadata and actions */}
              <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-muted pl-12 sm:pl-0 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px]">
                    {conv.messageCount} {conv.messageCount === 1 ? "message" : "messages"}
                  </span>
                  <span>•</span>
                  <RelativeTime date={conv.updatedAt} />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-7 px-2.5 text-xs text-muted hover:text-text"
                  >
                    <Link href={`/chats?id=${conv.id}`}>Open</Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted hover:text-text"
                        aria-label={`Options for ${conv.title}`}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 bg-surface border-border text-xs">
                      <DropdownMenuItem
                        onClick={() => handleStartRename(conv)}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(conv)}
                        className="gap-2 cursor-pointer text-danger focus:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md bg-surface border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text">Rename conversation</DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Update the title of this inquiry thread.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmRename} className="space-y-4 mt-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="e.g. Indemnity and Liability Scope"
              className="text-xs bg-bg/50 border-border focus:border-accent"
              autoFocus
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRenameTarget(null)}
                disabled={isRenaming}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isRenaming || !renameValue.trim()}
                className="text-xs bg-accent hover:bg-accent-hover text-white gap-1.5"
              >
                {isRenaming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete conversation?"
        description={`This will permanently remove the conversation "${deleteTarget?.title}" and its message history. Indexed documents and citations remain intact.`}
        confirmLabel="Delete conversation"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* New Chat Document Selection Modal */}
      <Dialog open={showNewChatModal} onOpenChange={setShowNewChatModal}>
        <DialogContent className="sm:max-w-md bg-surface border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text">Start a New Chat</DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Select one or more indexed agreements to question simultaneously.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
            {docsData?.items?.length ? (
              docsData.items.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleSelectDoc(doc.id)}
                    className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span className="text-xs text-text truncate">{doc.name}</span>
                    </div>
                    <span className="text-[10px] text-muted font-mono shrink-0">
                      {doc.pageCount ? `${doc.pageCount} p.` : ""}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted py-4 text-center">
                No ready contracts found. Please upload a contract first.
              </p>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewChatModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedDocIds.length === 0 || isStartingChat}
              onClick={handleCreateNewChat}
              className="text-xs bg-accent hover:bg-accent-hover text-white gap-1.5"
            >
              {isStartingChat && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Start Chat ({selectedDocIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

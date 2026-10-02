"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  X,
  MoreVertical,
  MessageSquare,
  GitCompare,
  Trash2,
  Edit2,
  Download,
  RotateCw,
  ExternalLink,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  Plus,
  Loader2,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useDocuments } from "@/lib/hooks/useDocuments";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { RelativeTime } from "@/components/app/RelativeTime";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { UploadDropzone } from "@/components/app/UploadDropzone";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("table");

  // Debounce search input to avoid race conditions
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Dialog states
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Auto-open upload modal if ?upload=1 query param exists and trigger sweep
  useEffect(() => {
    fetch("/api/jobs/sweep").catch(() => {});
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upload") === "1") {
        setShowUploadModal(true);
      }
    }
  }, []);

  const { documents, total, totalPages, isLoading, mutate } = useDocuments({
    search: debouncedSearch,
    status: statusFilter,
    sort: sortBy,
    page,
    limit: 20,
  });

  // Selection helpers
  const allCurrentSelected = useMemo(() => {
    if (documents.length === 0) return false;
    return documents.every((d) => selectedIds.has(d.id));
  }, [documents, selectedIds]);

  const someCurrentSelected = useMemo(() => {
    return documents.some((d) => selectedIds.has(d.id)) && !allCurrentSelected;
  }, [documents, selectedIds, allCurrentSelected]);

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allCurrentSelected) {
      documents.forEach((d) => next.delete(d.id));
    } else {
      documents.forEach((d) => next.add(d.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectDoc = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Actions
  const handleAskQuestion = async (documentIds) => {
    try {
      setIsCreatingChat(true);
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to start conversation");
      }
      toast.success("Conversation created");
      router.push(`/chats/${data.conversation.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleCompareSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length !== 2) return;
    router.push(`/compare?base=${ids[0]}&revised=${ids[1]}`);
  };

  const handleStartRename = (doc) => {
    setRenameTarget(doc);
    setRenameValue(doc.name);
  };

  const handleConfirmRename = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    try {
      setIsRenaming(true);
      const res = await fetch(`/api/documents/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to rename document");
      }
      toast.success("Document renamed");
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

    const previousDocs = documents;
    // Optimistic UI
    mutate(
      (prev) => (prev ? { ...prev, items: prev.items.filter((d) => d.id !== deleteTarget.id) } : prev),
      false
    );

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/documents/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to delete document");
      }

      toast.success(`Deleted "${deleteTarget.name}"`);
      const next = new Set(selectedIds);
      next.delete(deleteTarget.id);
      setSelectedIds(next);
      setDeleteTarget(null);
      mutate();
    } catch (err) {
      toast.error(err.message);
      // Rollback
      mutate();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      setIsBulkDeleting(true);
      const res = await fetch("/api/documents/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to delete selected documents");
      }

      toast.success(`Deleted ${ids.length} document${ids.length === 1 ? "" : "s"}`);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
      mutate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleRetry = async (docId) => {
    try {
      const res = await fetch(`/api/documents/${docId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to retry processing");
      }
      toast.success("Document queued for reprocessing");
      mutate();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        breadcrumbs={[{ label: "Clause", href: "/dashboard" }, { label: "Documents" }]}
        title="Document Library"
        description="Search, inspect, and manage indexed contracts and citations."
        actions={
          <Button
            size="sm"
            onClick={() => setShowUploadModal(true)}
            className="h-8 gap-1.5 text-xs bg-accent hover:bg-accent-hover text-white shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Upload Contract
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-[#121214] border border-[#27272a] rounded-lg">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#71717a] pointer-events-none" />
            <input
              type="text"
              placeholder="Search contracts by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 w-full pl-8 pr-8 text-xs rounded-md bg-[#18181b] text-[#ededed] border border-[#27272a] placeholder:text-[#71717a] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/40 transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setDebouncedSearch("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#ededed] p-0.5 rounded focus:outline-none"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-start">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] rounded-md px-2 py-1">
            <Filter className="h-3 w-3 text-[#71717a] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-[#ededed] border-none focus:outline-none cursor-pointer pr-1"
              aria-label="Filter documents by status"
            >
              <option value="ALL" className="bg-[#18181b] text-[#ededed]">All statuses</option>
              <option value="READY" className="bg-[#18181b] text-[#ededed]">Ready</option>
              <option value="EXTRACTING" className="bg-[#18181b] text-[#ededed]">Processing</option>
              <option value="NEEDS_OCR" className="bg-[#18181b] text-[#ededed]">Needs OCR</option>
              <option value="FAILED" className="bg-[#18181b] text-[#ededed]">Failed</option>
            </select>
          </div>

          {/* Sort order */}
          <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] rounded-md px-2 py-1">
            <ArrowUpDown className="h-3 w-3 text-[#71717a] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-[#ededed] border-none focus:outline-none cursor-pointer pr-1"
              aria-label="Sort documents"
            >
              <option value="newest" className="bg-[#18181b] text-[#ededed]">Newest</option>
              <option value="oldest" className="bg-[#18181b] text-[#ededed]">Oldest</option>
              <option value="name" className="bg-[#18181b] text-[#ededed]">Name</option>
              <option value="size" className="bg-[#18181b] text-[#ededed]">Size</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center border border-[#27272a] rounded-md bg-[#18181b] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === "table" ? "bg-[#27272a] text-[#ededed]" : "text-[#71717a] hover:text-[#ededed]"
              }`}
              aria-label="Table view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === "grid" ? "bg-[#27272a] text-[#ededed]" : "text-[#71717a] hover:text-[#ededed]"
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto mb-2" />
          <p className="text-xs text-muted">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? "No matching contracts" : "No contracts in library"}
          description={
            debouncedSearch
              ? `No contracts match "${debouncedSearch}". Try adjusting your search query or status filter.`
              : "Upload PDF or DOCX agreements to begin conversational question answering with word-for-word citations."
          }
          primaryAction={
            debouncedSearch
              ? {
                  label: "Clear search",
                  onClick: () => {
                    setSearchInput("");
                    setDebouncedSearch("");
                  },
                }
              : { label: "Upload contract", onClick: () => setShowUploadModal(true) }
          }
        />
      ) : viewMode === "table" ? (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-hover/50 text-muted font-medium">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-muted hover:text-text focus:outline-none"
                      aria-label="Select all documents on this page"
                    >
                      {allCurrentSelected ? (
                        <CheckSquare className="h-4 w-4 text-accent" />
                      ) : someCurrentSelected ? (
                        <MinusSquare className="h-4 w-4 text-accent" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Contract Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Pages</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Size</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Uploaded</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {documents.map((doc) => {
                  const isSelected = selectedIds.has(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      className={`group hover:bg-surface-hover/60 transition-colors ${
                        isSelected ? "bg-accent/5" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectDoc(doc.id)}
                          className="text-muted hover:text-text focus:outline-none"
                          aria-label={`Select ${doc.name}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-accent" />
                          ) : (
                            <Square className="h-4 w-4 text-muted/60 group-hover:text-muted" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[200px]">
                          <div className="h-7 w-7 rounded bg-surface border border-border flex items-center justify-center shrink-0 text-muted group-hover:text-accent transition-colors">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <div className="truncate">
                            <span className="font-medium text-text block truncate" title={doc.name}>
                              {doc.name}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {doc.versionLabel && (
                                <span className="text-[10px] text-muted font-mono">
                                  v{doc.versionLabel}
                                </span>
                              )}
                              <span className="md:hidden text-[10px] text-muted font-mono">
                                {formatBytes(doc.sizeBytes)}
                              </span>
                              {doc.pageCount && (
                                <span className="md:hidden text-[10px] text-muted font-mono">
                                  • {doc.pageCount}p
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge
                          status={doc.status}
                          progress={doc.progress}
                          statusDetail={doc.statusDetail}
                        />
                      </td>
                      <td className="py-3 px-3 text-muted font-mono whitespace-nowrap hidden md:table-cell">
                        {doc.pageCount ? `${doc.pageCount} p.` : "—"}
                      </td>
                      <td className="py-3 px-3 text-muted font-mono whitespace-nowrap hidden md:table-cell">
                        {formatBytes(doc.sizeBytes)}
                      </td>
                      <td className="py-3 px-3 text-muted whitespace-nowrap hidden md:table-cell">
                        <RelativeTime date={doc.createdAt} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted hover:text-text"
                              aria-label={`Open menu for ${doc.name}`}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 bg-surface border-border text-xs">
                            <DropdownMenuItem
                              onClick={() => handleAskQuestion([doc.id])}
                              className="gap-2 cursor-pointer"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-accent" />
                              Ask questions
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleStartRename(doc)}
                              className="gap-2 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Rename
                            </DropdownMenuItem>

                            {doc.blobUrl && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={doc.blobUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={doc.name}
                                  className="gap-2 cursor-pointer flex items-center"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Download original
                                </a>
                              </DropdownMenuItem>
                            )}

                            {doc.status === "FAILED" && (
                              <DropdownMenuItem
                                onClick={() => handleRetry(doc.id)}
                                className="gap-2 cursor-pointer text-unverified"
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                                Retry processing
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-border" />

                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(doc)}
                              className="gap-2 cursor-pointer text-danger focus:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-surface-hover/30 text-xs text-muted">
            <div>
              Showing {documents.length} of {total} document{total === 1 ? "" : "s"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 text-xs px-2.5"
              >
                Previous
              </Button>
              <span className="font-mono text-[11px]">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 text-xs px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Grid view */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.map((doc) => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <div
                  key={doc.id}
                  className={`group relative rounded-lg border p-4 bg-surface transition-all flex flex-col justify-between ${
                    isSelected ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-border-strong"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectDoc(doc.id)}
                        className="text-muted hover:text-text focus:outline-none"
                        aria-label={`Select ${doc.name}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-accent" />
                        ) : (
                          <Square className="h-4 w-4 text-muted/60" />
                        )}
                      </button>
                      <StatusBadge
                        status={doc.status}
                        progress={doc.progress}
                        statusDetail={doc.statusDetail}
                      />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted hover:text-text -mr-1"
                          aria-label={`Open menu for ${doc.name}`}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-surface border-border text-xs">
                        <DropdownMenuItem
                          onClick={() => handleAskQuestion([doc.id])}
                          className="gap-2 cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-accent" />
                          Ask questions
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStartRename(doc)}
                          className="gap-2 cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        {doc.blobUrl && (
                          <DropdownMenuItem asChild>
                            <a
                              href={doc.blobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={doc.name}
                              className="gap-2 cursor-pointer flex items-center"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download original
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(doc)}
                          className="gap-2 cursor-pointer text-danger focus:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-text line-clamp-2 mb-1" title={doc.name}>
                      {doc.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-muted font-mono">
                      <span>{doc.pageCount ? `${doc.pageCount} p.` : "—"}</span>
                      <span>•</span>
                      <span>{formatBytes(doc.sizeBytes)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted">
                    <RelativeTime date={doc.createdAt} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAskQuestion([doc.id])}
                      className="h-6 px-2 text-[11px] text-accent hover:text-accent hover:bg-accent/10 gap-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Chat
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface text-xs text-muted">
            <div>
              Showing {documents.length} of {total} document{total === 1 ? "" : "s"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 text-xs px-2.5"
              >
                Previous
              </Button>
              <span className="font-mono text-[11px]">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 text-xs px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-surface border border-accent/40 shadow-2xl rounded-full px-4 py-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-medium text-text whitespace-nowrap pl-1">
            <span className="font-mono text-accent font-bold">{selectedIds.size}</span> selected
          </span>

          <div className="h-4 w-px bg-border" />

          {/* Ask across selected (2+ docs) */}
          <Button
            size="sm"
            variant="ghost"
            disabled={selectedIds.size < 2 || isCreatingChat}
            onClick={() => handleAskQuestion(Array.from(selectedIds))}
            className="h-7 px-2.5 text-xs text-text hover:text-accent gap-1.5 disabled:opacity-40"
            title={selectedIds.size < 2 ? "Select at least 2 documents to ask across them" : "Create multi-document conversation"}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ask across selected
          </Button>

          {/* Compare (exactly 2 docs) */}
          <Button
            size="sm"
            variant="ghost"
            disabled={selectedIds.size !== 2}
            onClick={handleCompareSelected}
            className="h-7 px-2.5 text-xs text-text hover:text-accent gap-1.5 disabled:opacity-40"
            title={selectedIds.size !== 2 ? "Select exactly 2 documents to compare" : "Compare selected documents"}
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare
          </Button>

          {/* Delete selected */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowBulkDeleteDialog(true)}
            className="h-7 px-2.5 text-xs text-danger hover:text-danger hover:bg-danger/10 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-[11px] text-muted hover:text-text px-1 focus:outline-none"
            aria-label="Clear selection"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md bg-surface border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text">Rename contract</DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Update the display name for this agreement across the workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmRename} className="space-y-4 mt-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="e.g. Master Services Agreement v2.pdf"
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

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete contract permanently?"
        description={`This will permanently remove "${deleteTarget?.name}", its verified citations, and cloud blob storage. This action cannot be undone.`}
        confirmLabel="Delete contract"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        title={`Delete ${selectedIds.size} contracts permanently?`}
        description="This will permanently delete all selected documents, their extracted citations, chunks, and cloud storage blobs. This action cannot be undone."
        confirmLabel={`Delete ${selectedIds.size} contracts`}
        loading={isBulkDeleting}
        onConfirm={handleConfirmBulkDelete}
      />

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-lg bg-surface border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text">Upload Contract</DialogTitle>
            <DialogDescription className="text-xs text-muted">
              PDF or DOCX documents up to 50MB. Text is indexed for exact citation offsets.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <UploadDropzone
              onSuccess={(doc) => {
                setShowUploadModal(false);
                mutate();
                toast.success(`Uploaded "${doc.name}"`);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

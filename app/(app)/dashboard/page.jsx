"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import {
  FileText,
  MessageSquare,
  ShieldCheck,
  GitCompare,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/app/StatusBadge";
import { RelativeTime } from "@/components/app/RelativeTime";
import { EmptyState } from "@/components/app/EmptyState";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { UploadDropzone } from "@/components/app/UploadDropzone";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", fetcher);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Try sample contract action
  const handleTrySample = async () => {
    setSampleLoading(true);
    try {
      const res = await fetch("/api/sample", { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || "Failed to load sample");
      toast.success("Sample Master Services Agreement ingested!");
      mutate();
    } catch (err) {
      toast.error(err.message || "Failed to generate sample contract");
    } finally {
      setSampleLoading(false);
    }
  };

  // Quick Ask: create conversation from document
  const handleQuickAsk = async (docId, docName) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Analysis: ${docName}`,
          documentIds: [docId],
        }),
      });
      const chat = await res.json();
      if (!res.ok) throw new Error(chat.error?.message || "Could not start chat");
      router.push(`/chats/${chat.id}`);
    } catch (err) {
      toast.error(err.message || "Failed to start conversation");
    }
  };

  // Delete document
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/documents/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.message || "Failed to delete document");
      }
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      mutate();
    } catch (err) {
      toast.error(err.message || "Could not delete document");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-surface rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface rounded-xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, recentDocuments = [], recentConversations = [], activityFeed = [], isEmpty } =
    data || {};

  return (
    <div className="space-y-8 pb-12">
      {/* Greeting & Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {getGreeting()}, Counselor
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Here is your verifiable contract analysis overview.
        </p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={FileText}
          title="No contracts in workspace"
          description="Upload your first PDF or DOCX agreement to begin citation-verified analysis, or try our sample contract."
          primaryAction={
            <Link href="/documents?upload=1">
              <Button size="sm" className="bg-accent text-white gap-2 text-xs">
                <Plus className="h-4 w-4" />
                Upload your first contract
              </Button>
            </Link>
          }
          secondaryAction={
            <Button
              variant="outline"
              size="sm"
              onClick={handleTrySample}
              disabled={sampleLoading}
              className="text-xs gap-1.5"
            >
              {sampleLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              )}
              Try a sample contract
            </Button>
          }
          className="my-12"
        />
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/documents"
              className="group p-5 rounded-xl border border-border bg-surface hover:border-border-strong hover:bg-elevated/40 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between text-muted text-xs mb-3">
                <span className="font-mono">DOCUMENTS_READY</span>
                <FileText className="h-4 w-4 text-accent" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-text">
                {stats?.documentsReady ?? 0}
              </div>
              <p className="text-[11px] text-muted mt-1 group-hover:text-accent transition-colors flex items-center gap-1">
                View all documents <ArrowRight className="h-3 w-3" />
              </p>
            </Link>

            <Link
              href="/chats"
              className="group p-5 rounded-xl border border-border bg-surface hover:border-border-strong hover:bg-elevated/40 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between text-muted text-xs mb-3">
                <span className="font-mono">QUESTIONS_ASKED</span>
                <MessageSquare className="h-4 w-4 text-accent" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-text">
                {stats?.questionsAsked ?? 0}
              </div>
              <p className="text-[11px] text-muted mt-1 group-hover:text-accent transition-colors flex items-center gap-1">
                Open conversations <ArrowRight className="h-3 w-3" />
              </p>
            </Link>

            <Link
              href="/chats"
              className="group p-5 rounded-xl border border-border bg-surface hover:border-border-strong hover:bg-elevated/40 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between text-muted text-xs mb-3">
                <span className="font-mono">QUOTES_VERIFIED</span>
                <ShieldCheck className="h-4 w-4 text-verified" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-text">
                  {stats?.quotesVerified ?? 0}
                </span>
                <span className="text-xs font-mono text-verified font-medium">
                  {stats?.verifiedRate ?? 100}% verified
                </span>
              </div>
              <p className="text-[11px] text-muted mt-1">
                Zero hallucinated quotes
              </p>
            </Link>

            <Link
              href="/compare"
              className="group p-5 rounded-xl border border-border bg-surface hover:border-border-strong hover:bg-elevated/40 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between text-muted text-xs mb-3">
                <span className="font-mono">COMPARISONS_RUN</span>
                <GitCompare className="h-4 w-4 text-accent" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-text">
                {stats?.comparisonsRun ?? 0}
              </div>
              <p className="text-[11px] text-muted mt-1 group-hover:text-accent transition-colors flex items-center gap-1">
                Redline history <ArrowRight className="h-3 w-3" />
              </p>
            </Link>
          </div>

          {/* Upload Dropzone */}
          <div>
            <UploadDropzone onUploaded={() => mutate()} />
          </div>

          {/* Two-Column Section: Left (Recent Docs & Activity) / Right (Conversations) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column (7 cols) */}
            <div className="lg:col-span-7 space-y-8">
              {/* Recent Documents */}
              <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-border bg-elevated/40">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold text-text">Recent Contracts</span>
                  </div>
                  <Link href="/documents" className="text-xs text-accent hover:underline">
                    View library
                  </Link>
                </div>

                <div className="divide-y divide-border/60">
                  {recentDocuments.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted">
                      No documents ingested yet.
                    </div>
                  ) : (
                    recentDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 flex items-center justify-between gap-3 hover:bg-elevated/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-text truncate">
                              {doc.name}
                            </span>
                            <StatusBadge status={doc.status} progress={doc.progress} />
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted mt-1 font-mono">
                            {doc.pageCount && <span>{doc.pageCount} pages</span>}
                            <span>•</span>
                            <RelativeTime date={doc.createdAt} />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link href={`/documents?highlight=${doc.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                              Open
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAsk(doc.id, doc.name)}
                            className="h-7 text-xs px-2 text-accent hover:bg-accent/10 border-border"
                          >
                            Ask
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(doc)}
                            className="h-7 w-7 p-0 text-muted hover:text-danger"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Activity Feed */}
              <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-elevated/40 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold text-text">Audit Activity Feed</span>
                </div>

                <div className="divide-y divide-border/60">
                  {activityFeed.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted">
                      No recent activity recorded.
                    </div>
                  ) : (
                    activityFeed.map((act) => (
                      <Link
                        key={act.id}
                        href={act.link}
                        className="p-3.5 flex items-center justify-between text-xs hover:bg-elevated/30 transition-colors block"
                      >
                        <div className="truncate mr-3">
                          <span className="text-text font-medium">{act.title}: </span>
                          <span className="text-muted truncate">{act.detail}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted/70 shrink-0">
                          <RelativeTime date={act.timestamp} />
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Recent Conversations */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-border bg-elevated/40">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-verified" />
                    <span className="text-xs font-semibold text-text">Recent Chats</span>
                  </div>
                  <Link href="/chats" className="text-xs text-accent hover:underline">
                    View all
                  </Link>
                </div>

                <div className="divide-y divide-border/60">
                  {recentConversations.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted">
                      No conversations yet. Start one by asking questions about any contract.
                    </div>
                  ) : (
                    recentConversations.map((chat) => (
                      <Link
                        key={chat.id}
                        href={`/chats/${chat.id}`}
                        className="p-4 block hover:bg-elevated/30 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-text truncate">
                            {chat.title}
                          </span>
                          <span className="text-[10px] font-mono text-muted/70 shrink-0">
                            <RelativeTime date={chat.updatedAt} />
                          </span>
                        </div>

                        {chat.documents?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {chat.documents.map((cd) => (
                              <span
                                key={cd.id}
                                className="text-[10px] font-mono rounded bg-elevated border border-border px-1.5 py-0.2 text-muted"
                              >
                                {cd.document?.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {chat.messages?.[0] && (
                          <p className="text-[11px] text-muted truncate">
                            {chat.messages[0].content}
                          </p>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete contract permanently?"
        description={`This will permanently remove "${deleteTarget?.name}" and all extracted pages, chunks, citations, and comparison links. This cannot be undone.`}
        confirmLabel="Delete Contract"
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

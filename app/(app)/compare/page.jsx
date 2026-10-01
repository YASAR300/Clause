"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  GitCompare,
  Plus,
  ArrowRight,
  FileText,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { RelativeTime } from "@/components/app/RelativeTime";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ComparePage() {
  const router = useRouter();
  const [showNewModal, setShowNewModal] = useState(false);
  const [baseDocId, setBaseDocId] = useState("");
  const [revisedDocId, setRevisedDocId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, mutate } = useSWR("/api/comparisons", fetcher);
  const { data: docsData } = useSWR(showNewModal ? "/api/documents?status=READY&limit=50" : null, fetcher);

  const comparisons = data?.comparisons || [];
  const readyDocs = docsData?.items || [];

  const handleCreateComparison = async () => {
    if (!baseDocId || !revisedDocId) return;
    if (baseDocId === revisedDocId) {
      toast.error("Please select two distinct contracts to compare");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseDocumentId: baseDocId, revisedDocumentId: revisedDocId }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || "Failed to start comparison");
      }

      toast.success("Comparison initialized");
      setShowNewModal(false);
      setBaseDocId("");
      setRevisedDocId("");
      mutate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        breadcrumbs={[{ label: "Clause", href: "/dashboard" }, { label: "Compare" }]}
        title="Version Comparisons"
        description="Inspect redlines, added liabilities, and semantic clause drifts across contract versions."
        actions={
          <Button
            size="sm"
            onClick={() => setShowNewModal(true)}
            className="h-8 gap-1.5 text-xs bg-accent hover:bg-accent-hover text-white shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New Comparison
          </Button>
        }
      />

      {/* Comparisons List */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto mb-2" />
          <p className="text-xs text-muted">Loading comparisons...</p>
        </div>
      ) : comparisons.length === 0 ? (
        <EmptyState
          title="No comparisons yet"
          description="Compare two agreements side-by-side to compute clause-level additions, removals, and risk severity."
          primaryAction={{
            label: "Create comparison",
            onClick: () => setShowNewModal(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {comparisons.map((comp) => (
            <div
              key={comp.id}
              className="p-4 rounded-lg border border-border bg-surface hover:bg-surface-hover/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 text-muted">
                  <GitCompare className="h-4 w-4 text-accent" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-semibold text-text truncate max-w-[220px]" title={comp.baseDocument?.name}>
                      {comp.baseDocument?.name || "Original contract"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="font-semibold text-text truncate max-w-[220px]" title={comp.revisedDocument?.name}>
                      {comp.revisedDocument?.name || "Revised version"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted">
                    <RelativeTime date={comp.createdAt} />
                    <span>•</span>
                    <span className="font-mono text-accent">
                      {comp.changeCount} {comp.changeCount === 1 ? "change" : "changes"} detected
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge
                  variant="outline"
                  className={`text-[11px] font-mono ${
                    comp.status === "READY"
                      ? "border-verified/30 bg-verified/10 text-verified"
                      : comp.status === "FAILED"
                      ? "border-danger/30 bg-danger/10 text-danger"
                      : "border-accent/40 bg-accent/10 text-accent"
                  }`}
                >
                  {comp.status === "READY"
                    ? "Ready"
                    : comp.status === "FAILED"
                    ? "Failed"
                    : "Processing"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Comparison Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="sm:max-w-md bg-surface border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text">Compare Two Contracts</DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Select the original base agreement and the revised counterpart to generate a semantic diff.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <label className="text-xs font-medium text-text block mb-1.5">
                Base Document (Original)
              </label>
              <select
                value={baseDocId}
                onChange={(e) => setBaseDocId(e.target.value)}
                className="w-full h-9 rounded-md bg-bg border border-border px-3 text-xs text-text focus:outline-none focus:border-accent"
                aria-label="Select base document"
              >
                <option value="">Select original contract...</option>
                {readyDocs.map((doc) => (
                  <option key={doc.id} value={doc.id} disabled={doc.id === revisedDocId}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-text block mb-1.5">
                Revised Document (Counterpart / New Version)
              </label>
              <select
                value={revisedDocId}
                onChange={(e) => setRevisedDocId(e.target.value)}
                className="w-full h-9 rounded-md bg-bg border border-border px-3 text-xs text-text focus:outline-none focus:border-accent"
                aria-label="Select revised document"
              >
                <option value="">Select revised contract...</option>
                {readyDocs.map((doc) => (
                  <option key={doc.id} value={doc.id} disabled={doc.id === baseDocId}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!baseDocId || !revisedDocId || baseDocId === revisedDocId || isSubmitting}
              onClick={handleCreateComparison}
              className="text-xs bg-accent hover:bg-accent-hover text-white gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Start Comparison
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

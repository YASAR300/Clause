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
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { RelativeTime } from "@/components/app/RelativeTime";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ComparePage() {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);

  const { data, isLoading, mutate } = useSWR("/api/comparisons", fetcher, {
    refreshInterval: 5000,
  });

  const comparisons = data?.comparisons || [];

  const handleDelete = async (e, compId) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this comparison?")) return;

    try {
      setDeletingId(compId);
      const res = await fetch(`/api/comparisons/${compId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete comparison");
      toast.success("Comparison removed");
      mutate();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
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
            onClick={() => router.push("/compare/new")}
            className="h-8 gap-1.5 text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-sm font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            New Comparison
          </Button>
        }
      />

      {/* Comparisons List */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6] mx-auto mb-2" />
          <p className="text-xs text-muted">Loading comparisons...</p>
        </div>
      ) : comparisons.length === 0 ? (
        <EmptyState
          title="No comparisons yet"
          description="Compare two agreements side-by-side to compute clause-level additions, removals, and risk severity."
          primaryAction={{
            label: "Create comparison",
            onClick: () => router.push("/compare/new"),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {comparisons.map((comp) => {
            const summary = comp.summary || {};
            const counts = summary.counts;

            return (
              <div
                key={comp.id}
                onClick={() => router.push(`/compare/${comp.id}`)}
                className="p-4 rounded-xl border border-border bg-[#121215] hover:bg-[#16161a] hover:border-border-strong cursor-pointer transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0 text-muted">
                    <GitCompare className="h-4 w-4 text-[#3b82f6]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span
                        className="font-semibold text-text truncate max-w-[240px]"
                        title={comp.baseDocument?.name}
                      >
                        {comp.baseDocument?.name || "Original contract"}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span
                        className="font-semibold text-text truncate max-w-[240px] text-[#10b981]"
                        title={comp.revisedDocument?.name}
                      >
                        {comp.revisedDocument?.name || "Revised version"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-muted flex-wrap">
                      <RelativeTime date={comp.createdAt} />
                      <span>•</span>
                      <span className="font-mono text-[#3b82f6]">
                        {comp.changeCount} {comp.changeCount === 1 ? "change" : "changes"} detected
                      </span>

                      {counts && (
                        <>
                          <span>•</span>
                          <span className="text-[10px] text-[#ef4444] font-mono">
                            {counts.critical || 0} critical
                          </span>
                          <span className="text-[10px] text-[#f59e0b] font-mono">
                            {counts.major || 0} major
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-mono ${
                      comp.status === "READY"
                        ? "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]"
                        : comp.status === "FAILED"
                        ? "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]"
                        : "border-[#3b82f6]/40 bg-[#3b82f6]/10 text-[#3b82f6]"
                    }`}
                  >
                    {comp.status === "READY"
                      ? "Ready"
                      : comp.status === "FAILED"
                      ? "Failed"
                      : "Processing"}
                  </Badge>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, comp.id)}
                    disabled={deletingId === comp.id}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                    aria-label="Delete comparison"
                  >
                    {deletingId === comp.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

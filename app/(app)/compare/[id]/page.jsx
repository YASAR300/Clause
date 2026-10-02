"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  GitCompare,
  ArrowRight,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  SlidersHorizontal,
  Eye,
  EyeOff,
  RotateCw,
  Sparkles,
  ShieldAlert,
  Calendar,
  DollarSign,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DiffView } from "@/components/compare/DiffView";
import { SplitDocViewerModal } from "@/components/compare/SplitDocViewerModal";

const fetcher = (url) => fetch(url).then((res) => res.json());

const SIGNIFICANCE_ORDER = {
  CRITICAL: 1,
  MAJOR: 2,
  MINOR: 3,
  COSMETIC: 4,
  UNREVIEWED: 5,
};

export default function ComparisonDetailPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const comparisonId = resolvedParams.id;

  // Poll while QUEUED or PROCESSING
  const { data, error, isLoading, mutate } = useSWR(
    comparisonId ? `/api/comparisons/${comparisonId}` : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        const status = latestData?.comparison?.status;
        return status === "QUEUED" || status === "PROCESSING" ? 1500 : 0;
      },
    }
  );

  const comparison = data?.comparison;
  const status = comparison?.status || "QUEUED";
  const changes = comparison?.changes || [];
  const summaryObj = comparison?.summary || {};

  // Extract counts
  const counts = summaryObj?.counts || {
    critical: changes.filter((c) => c.significance === "CRITICAL").length,
    major: changes.filter((c) => c.significance === "MAJOR").length,
    minor: changes.filter((c) => c.significance === "MINOR").length,
    cosmetic: changes.filter((c) => c.significance === "COSMETIC").length,
    unreviewed: changes.filter((c) => c.significance === "UNREVIEWED").length,
    total: changes.length,
  };

  // URL State helpers
  const activeSignificance = searchParams.get("significance") || "ALL";
  const activeCategory = searchParams.get("category") || "ALL";
  const activeType = searchParams.get("type") || "ALL";
  const activeSort = searchParams.get("sort") || "significance"; // "significance" | "order" | "category"
  const searchQuery = searchParams.get("q") || "";
  const collapseCosmetic = searchParams.get("collapseCosmetic") === "true";

  const updateUrlParam = useCallback(
    (key, val) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!val || val === "ALL" || (key === "collapseCosmetic" && val === false)) {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Accordion state for expanded diffs
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedChangeIndex, setSelectedChangeIndex] = useState(0);

  // Split Viewer Modal state
  const [activeViewerChange, setActiveViewerChange] = useState(null);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter and sort items
  const filteredChanges = useMemo(() => {
    let result = [...changes];

    // Filter by Significance
    if (activeSignificance !== "ALL") {
      result = result.filter((c) => c.significance === activeSignificance);
    }

    // Filter by Category
    if (activeCategory !== "ALL") {
      result = result.filter(
        (c) => c.category?.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    // Filter by Change Type
    if (activeType !== "ALL") {
      result = result.filter((c) => c.changeType === activeType);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.heading?.toLowerCase().includes(q) ||
          c.summary?.toLowerCase().includes(q) ||
          c.whyItMatters?.toLowerCase().includes(q) ||
          c.baseText?.toLowerCase().includes(q) ||
          c.revisedText?.toLowerCase().includes(q)
      );
    }

    // Collapse or hide cosmetic changes if toggled
    if (collapseCosmetic && activeSignificance === "ALL") {
      result = result.filter((c) => c.significance !== "COSMETIC");
    }

    // Sorting
    result.sort((a, b) => {
      if (activeSort === "significance") {
        const rankA = SIGNIFICANCE_ORDER[a.significance] || 99;
        const rankB = SIGNIFICANCE_ORDER[b.significance] || 99;
        if (rankA !== rankB) return rankA - rankB;
        return (a.position || 0) - (b.position || 0);
      }
      if (activeSort === "category") {
        return (a.category || "").localeCompare(b.category || "");
      }
      // "order" default
      return (a.position || 0) - (b.position || 0);
    });

    return result;
  }, [
    changes,
    activeSignificance,
    activeCategory,
    activeType,
    searchQuery,
    collapseCosmetic,
    activeSort,
  ]);

  // Keyboard navigation (j/k)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedChangeIndex((prev) => {
          const next = Math.min(prev + 1, filteredChanges.length - 1);
          const el = document.getElementById(`change-card-${next}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          return next;
        });
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedChangeIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          const el = document.getElementById(`change-card-${next}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredChanges]);

  const handleDeleteComparison = async () => {
    if (!confirm("Are you sure you want to delete this comparison?")) return;
    try {
      const res = await fetch(`/api/comparisons/${comparisonId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete comparison");
      toast.success("Comparison deleted");
      router.push("/compare");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // 1. Loading state
  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center p-12 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#3b82f6] mb-3" />
        <p className="text-xs text-muted font-mono">Retrieving comparison details...</p>
      </div>
    );
  }

  // 2. Failed state
  if (status === "FAILED") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pt-6">
        <div className="p-8 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-[#ef4444] mx-auto" />
          <div>
            <h2 className="text-base font-semibold text-text">Comparison Pipeline Failed</h2>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
              {summaryObj?.error || "An error occurred while analyzing the contract versions."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/compare")}
              className="text-xs"
            >
              Back to Comparisons
            </Button>
            <Button
              size="sm"
              onClick={() => mutate()}
              className="text-xs bg-[#3b82f6] text-white gap-1.5"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry Check
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Processing or Queued State
  if (status === "QUEUED" || status === "PROCESSING") {
    const stage = summaryObj?.stage || (status === "QUEUED" ? "Queued for processing..." : "Analyzing clauses...");
    const progress = summaryObj?.progress || (status === "QUEUED" ? 5 : 45);

    return (
      <div className="max-w-3xl mx-auto space-y-8 pt-10 pb-20">
        <PageHeader
          breadcrumbs={[
            { label: "Clause", href: "/dashboard" },
            { label: "Compare", href: "/compare" },
            { label: "Processing" },
          ]}
          title="Comparing Agreements"
          description="Segmenting clauses, computing fact diffs, and classifying risk severity..."
        />

        <div className="p-8 rounded-xl border border-border bg-[#121215] space-y-6 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#3b82f6]" />
              <span className="font-semibold text-text">{stage}</span>
            </div>
            <span className="font-mono text-muted">{progress}%</span>
          </div>

          <Progress value={progress} className="h-2 bg-[#222226]" />

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#222226] text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-muted font-mono uppercase">Base Contract</span>
              <p className="font-medium text-text truncate">{comparison?.baseDocument?.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-[#10b981] font-mono uppercase">Revised Contract</span>
              <p className="font-medium text-text truncate">{comparison?.revisedDocument?.name}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Ready State with Changes List
  return (
    <div className="space-y-6 pb-24">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222226] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted mb-1 font-mono">
            <span className="hover:text-text cursor-pointer" onClick={() => router.push("/compare")}>
              Compare
            </span>
            <span>/</span>
            <span>Redline Inspection</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-base font-semibold text-text truncate max-w-sm" title={comparison?.baseDocument?.name}>
              {comparison?.baseDocument?.name}
            </span>
            <ArrowRight className="h-4 w-4 text-muted shrink-0" />
            <span className="text-base font-semibold text-text truncate max-w-sm text-[#10b981]" title={comparison?.revisedDocument?.name}>
              {comparison?.revisedDocument?.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteComparison}
            className="text-xs text-muted hover:text-[#ef4444] border-border hover:border-[#ef4444]/40 h-8 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Overall Summary Card */}
      <div className="p-5 rounded-xl border border-border bg-[#121215] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
            <span className="text-xs font-semibold text-text uppercase tracking-wider">
              Executive Summary & Clause Drift
            </span>
          </div>

          {/* Counts Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2 py-0.5 rounded-full border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444] font-mono font-medium">
              {counts.critical} critical
            </span>
            <span className="px-2 py-0.5 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] font-mono font-medium">
              {counts.major} major
            </span>
            <span className="px-2 py-0.5 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6] font-mono font-medium">
              {counts.minor} minor
            </span>
            <span className="px-2 py-0.5 rounded-full border border-[#27272a] bg-[#18181b] text-muted font-mono font-medium">
              {counts.cosmetic} cosmetic
            </span>
          </div>
        </div>

        <p className="text-xs text-text/90 leading-relaxed font-sans">
          {summaryObj?.plainText ||
            (changes.length > 0
              ? `Automated redline detected ${changes.length} clause revisions across both versions, including changes in obligations, financial limits, and rights.`
              : "No substantial clause revisions detected between these two contract drafts.")}
        </p>
      </div>

      {/* Filters and Controls Toolbar */}
      <div className="space-y-3 bg-[#101012] p-4 rounded-xl border border-border">
        {/* Top Controls Row: Search + Sort + Cosmetic Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search clause headings, text, or facts..."
              value={searchQuery}
              onChange={(e) => updateUrlParam("q", e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-[#0c0c0e] border border-border text-text placeholder:text-muted focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sort:</span>
              <select
                value={activeSort}
                onChange={(e) => updateUrlParam("sort", e.target.value)}
                className="h-8 rounded-lg bg-[#0c0c0e] border border-border px-2 text-xs text-text focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="significance">Significance (Default)</option>
                <option value="order">Document Order</option>
                <option value="category">Category</option>
              </select>
            </div>

            {/* Collapse Cosmetic Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateUrlParam("collapseCosmetic", !collapseCosmetic)}
              className={`h-8 text-xs gap-1.5 border-border ${
                collapseCosmetic
                  ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/40"
                  : "text-muted hover:text-text"
              }`}
            >
              {collapseCosmetic ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Cosmetic Hidden
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Showing Cosmetic
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filter Chips Rows */}
        <div className="space-y-2 pt-2 border-t border-[#222226]">
          {/* Significance Chips */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[10px] uppercase font-mono text-muted w-20 shrink-0">
              Severity:
            </span>
            {["ALL", "CRITICAL", "MAJOR", "MINOR", "COSMETIC"].map((level) => {
              const count =
                level === "ALL"
                  ? changes.length
                  : changes.filter((c) => c.significance === level).length;
              const isActive = activeSignificance === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => updateUrlParam("significance", level)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                    isActive
                      ? "bg-[#3b82f6] text-white font-semibold"
                      : "bg-[#18181b] text-muted hover:text-text border border-[#27272a]"
                  }`}
                >
                  {level} {count > 0 && <span className="opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Change Type Chips */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[10px] uppercase font-mono text-muted w-20 shrink-0">
              Type:
            </span>
            {["ALL", "MODIFIED", "ADDED", "REMOVED", "MOVED"].map((type) => {
              const isActive = activeType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateUrlParam("type", type)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                    isActive
                      ? "bg-[#27272a] text-text font-semibold border border-[#3f3f46]"
                      : "bg-[#141416] text-muted hover:text-text border border-[#222226]"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Change Cards List */}
      <div className="space-y-4">
        {filteredChanges.length === 0 ? (
          <div className="p-12 rounded-xl border border-border bg-[#121215] text-center space-y-2">
            <CheckCircle2 className="h-6 w-6 text-[#10b981] mx-auto mb-1" />
            <h3 className="text-sm font-semibold text-text">No changes match active filters</h3>
            <p className="text-xs text-muted">
              Try adjusting the significance or search query in the filter bar above.
            </p>
          </div>
        ) : (
          filteredChanges.map((change, idx) => {
            const isExpanded = expandedIds.has(change.id);
            const isSelected = selectedChangeIndex === idx;
            const facts = Array.isArray(change.facts) ? change.facts : [];

            return (
              <div
                key={change.id}
                id={`change-card-${idx}`}
                className={`rounded-xl border transition-all duration-200 overflow-hidden bg-[#121215] ${
                  isSelected
                    ? "border-[#3b82f6]/60 shadow-[0_0_15px_rgba(59,130,246,0.12)]"
                    : "border-border hover:border-border-strong"
                }`}
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(change.id)}
                  className="p-4 cursor-pointer select-none flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#121215] hover:bg-[#16161a] transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Significance Badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono uppercase ${
                          change.significance === "CRITICAL"
                            ? "border-[#ef4444]/40 bg-[#ef4444]/15 text-[#ef4444]"
                            : change.significance === "MAJOR"
                            ? "border-[#f59e0b]/40 bg-[#f59e0b]/15 text-[#f59e0b]"
                            : change.significance === "MINOR"
                            ? "border-[#3b82f6]/40 bg-[#3b82f6]/15 text-[#3b82f6]"
                            : "border-[#27272a] bg-[#18181b] text-muted"
                        }`}
                      >
                        {change.significance}
                      </Badge>

                      {/* Type Badge */}
                      <Badge variant="outline" className="text-[10px] font-mono text-muted">
                        {change.changeType}
                      </Badge>

                      {/* Category Badge */}
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-[#27272a] bg-[#18181b] text-text/80"
                      >
                        {change.category}
                      </Badge>

                      {/* Heading */}
                      <span className="font-semibold text-xs text-text truncate max-w-md">
                        {change.heading || `Clause ${idx + 1}`}
                      </span>
                    </div>

                    {/* Plain Language Summary */}
                    <p className="text-xs text-text/90 leading-relaxed">
                      {change.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveViewerChange(change);
                      }}
                      className="h-7 text-xs text-[#3b82f6] hover:bg-[#3b82f6]/10 gap-1 px-2.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View in documents
                    </Button>

                    <button
                      type="button"
                      aria-label="Toggle diff"
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted hover:text-text hover:bg-[#222226]"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Facts before->after chips */}
                {facts.length > 0 && (
                  <div className="px-4 py-2 bg-[#0d0d0f] border-t border-border flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase text-muted tracking-wider">
                      Facts:
                    </span>
                    {facts.map((f, fIdx) => (
                      <div
                        key={fIdx}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-[11px] font-mono"
                      >
                        <span className="text-muted capitalize">{f.type}:</span>
                        <span className="text-[#ef4444] line-through">{f.before || "none"}</span>
                        <ArrowRight className="h-3 w-3 text-muted" />
                        <span className="text-[#10b981] font-medium">{f.after || "none"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Why it Matters Callout */}
                {change.whyItMatters && (
                  <div className="px-4 py-2.5 bg-[#141418] border-t border-border text-xs text-muted flex items-start gap-2">
                    <span className="font-semibold text-text shrink-0 text-[11px]">
                      Why it matters:
                    </span>
                    <span className="text-text/80">{change.whyItMatters}</span>
                  </div>
                )}

                {/* Expandable Side-by-Side Redline Diff */}
                {isExpanded && (
                  <div className="p-4 border-t border-border bg-[#09090b]">
                    <DiffView
                      baseText={change.baseText}
                      revisedText={change.revisedText}
                      viewMode="split"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Split Viewer Modal */}
      <SplitDocViewerModal
        isOpen={!!activeViewerChange}
        onClose={() => setActiveViewerChange(null)}
        change={activeViewerChange}
        baseDocument={comparison?.baseDocument}
        revisedDocument={comparison?.revisedDocument}
      />
    </div>
  );
}

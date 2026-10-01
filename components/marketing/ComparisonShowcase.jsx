"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  GitCompare,
  AlertOctagon,
  AlertTriangle,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const MOCK_CHANGES = [
  {
    id: "change-1",
    significance: "CRITICAL",
    category: "Financial Exposure",
    heading: "Section 12.2 • Liability Cap Tenfold Increase",
    summary: "Liability cap: AED 100,000 → AED 1,000,000",
    whyItMatters:
      "Directly expands maximum claim exposure from AED 100,000 to AED 1,000,000 without reciprocal protections or insurance offsets.",
    baseText: "The aggregate liability of either party shall not exceed AED 100,000.",
    revisedText: "The aggregate liability of either party shall not exceed AED 1,000,000.",
    defaultExpanded: true,
  },
  {
    id: "change-2",
    significance: "MAJOR",
    category: "Risk Allocation",
    heading: "Section 9.4 • Indemnification Scope Expansion",
    summary: "Indemnity widened to include gross negligence tort claims",
    whyItMatters:
      "Customer obligation expanded from standard direct breach to third-party claims alleging negligence, shifting uninsurable risk.",
    baseText:
      "Customer shall indemnify Vendor against direct claims arising solely from breach of Section 4.",
    revisedText:
      "Customer shall indemnify Vendor against direct and third-party claims arising from breach or gross negligence.",
    defaultExpanded: false,
  },
  {
    id: "change-3",
    significance: "MINOR",
    category: "Operational Timelines",
    heading: "Section 16.1 • Notice Delivery Period",
    summary: "Notice window shortened from 10 to 5 business days",
    whyItMatters:
      "Tightens operational compliance window for breach notifications. Requires faster legal response.",
    baseText: "Written notice must be transmitted within ten (10) business days.",
    revisedText: "Written notice must be transmitted within five (5) business days.",
    defaultExpanded: false,
  },
  {
    id: "change-4",
    significance: "COSMETIC",
    category: "Drafting Style",
    heading: "Section 21.8 • Typo Fix in Statutory Reference",
    summary: "Corrected statutory reference from 'Code 2018' to 'Code 2024'",
    whyItMatters:
      "Non-substantive grammatical and citation fix aligning with revised statutory codes.",
    baseText: "Governed in accordance with Delaware Commercial Code (2018 Edition).",
    revisedText: "Governed in accordance with Delaware Commercial Code (2024 Edition).",
    defaultExpanded: false,
  },
];

const FILTER_OPTIONS = [
  { id: "ALL", label: "All Changes" },
  { id: "CRITICAL", label: "Critical" },
  { id: "MAJOR", label: "Major" },
  { id: "MINOR", label: "Minor" },
  { id: "COSMETIC", label: "Cosmetic" },
];

export function ComparisonShowcase() {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [expandedItems, setExpandedItems] = useState({
    "change-1": true,
  });

  const toggleExpand = (id) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Client-side filtering
  const filteredChanges = useMemo(() => {
    if (activeFilter === "ALL") return MOCK_CHANGES;
    return MOCK_CHANGES.filter((item) => item.significance === activeFilter);
  }, [activeFilter]);

  const getSignificanceBadge = (significance) => {
    switch (significance) {
      case "CRITICAL":
        return (
          <Badge className="bg-danger/15 text-danger border-danger/30 text-[10px] font-mono gap-1">
            <AlertOctagon className="h-3 w-3" /> CRITICAL
          </Badge>
        );
      case "MAJOR":
        return (
          <Badge className="bg-unverified/15 text-unverified border-unverified/30 text-[10px] font-mono gap-1">
            <AlertTriangle className="h-3 w-3" /> MAJOR
          </Badge>
        );
      case "MINOR":
        return (
          <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] font-mono gap-1">
            <Info className="h-3 w-3" /> MINOR
          </Badge>
        );
      case "COSMETIC":
      default:
        return (
          <Badge variant="outline" className="text-muted text-[10px] font-mono">
            COSMETIC
          </Badge>
        );
    }
  };

  return (
    <section id="compare" className="py-24 border-b border-border/60 bg-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3.5 border-border bg-surface px-3 py-1 text-xs gap-1.5"
          >
            <GitCompare className="h-3.5 w-3.5 text-accent" />
            Redline Intelligence
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text mb-4">
            Version comparison with significance ranking.
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Stop scanning manual word diffs for hours. Clause isolates every contractual
            change and ranks them by real legal consequence.
          </p>
        </div>

        {/* Comparison Showcase Container */}
        <div className="rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
          {/* Top Bar with Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border bg-elevated/40">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {FILTER_OPTIONS.map((f) => {
                const count =
                  f.id === "ALL"
                    ? MOCK_CHANGES.length
                    : MOCK_CHANGES.filter((c) => c.significance === f.id).length;
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-surface border border-border text-text shadow-sm"
                        : "text-muted hover:text-text"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`text-[10px] rounded-full px-1.5 py-0.2 ${
                        isActive ? "bg-elevated text-text" : "text-muted/60"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-muted font-mono hidden sm:block">
              Comparing v1.0 (Nov 2025) → v2.1 (Jan 2026)
            </div>
          </div>

          {/* Change Items List */}
          <div className="divide-y divide-border/60">
            {filteredChanges.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                No changes found under the &quot;{activeFilter}&quot; filter.
              </div>
            ) : (
              filteredChanges.map((change) => {
                const isExpanded = !!expandedItems[change.id];
                return (
                  <div key={change.id} className="p-5 sm:p-6 transition-colors hover:bg-elevated/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                      <div className="flex items-center gap-2.5">
                        {getSignificanceBadge(change.significance)}
                        <span className="text-xs font-mono text-muted/80">
                          {change.category}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-muted/60">
                        {change.heading}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="text-sm font-semibold text-text">
                          {change.summary}
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                          {change.whyItMatters}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleExpand(change.id)}
                        className="p-1 rounded text-muted hover:text-text transition-colors shrink-0"
                        aria-label={isExpanded ? "Collapse diff" : "Expand diff"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Expandable Diff Snippet */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono animate-in fade-in duration-200">
                        <div className="p-3 rounded-md border border-danger/30 bg-danger/5 text-text space-y-1">
                          <span className="text-[10px] text-danger font-sans uppercase font-bold tracking-wider block">
                            Baseline Text:
                          </span>
                          <span className="text-muted/90">&quot;{change.baseText}&quot;</span>
                        </div>
                        <div className="p-3 rounded-md border border-verified/30 bg-verified/5 text-text space-y-1">
                          <span className="text-[10px] text-verified font-sans uppercase font-bold tracking-wider block">
                            Revised Text:
                          </span>
                          <span className="text-text font-medium">&quot;{change.revisedText}&quot;</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

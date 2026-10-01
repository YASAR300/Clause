"use client";

import { useState } from "react";
import { SpotlightCard } from "@/components/marketing/SpotlightCard";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  Search,
  Check,
  GitCompare,
  Terminal,
  Layers,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export function FeatureBento() {
  // Card 2 interactive state: click-to-highlight
  const [highlightActive, setHighlightActive] = useState(true);

  // Card 3 interactive state: multi-doc selection
  const [selectedDocs, setSelectedDocs] = useState(["doc1", "doc2"]);

  const toggleDoc = (id) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  return (
    <section id="features" className="py-24 border-b border-border/60 bg-bg">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge
            variant="outline"
            className="mb-3.5 border-border bg-surface px-3 py-1 text-xs"
          >
            Engineered For Precision
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text mb-4">
            Every feature built around verifiable ground truth.
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            No black-box summaries. Everything is anchored directly into the text with
            exact coordinates, automated diffing, and open audit trails.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* 1. Verified Quotes (8 cols) */}
          <SpotlightCard className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-between">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                  Zero Hallucinations
                </span>
                <Badge
                  variant="outline"
                  className="border-verified/30 bg-verified/10 text-verified text-[11px] gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" /> Exact Offset Match
                </Badge>
              </div>
              <h3 className="text-xl font-semibold text-text mb-2">
                Server-Verified Quotations
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
                Every quote presented in an answer is scanned against the document buffer.
                If even a single character fails validation, it cannot be labeled as a verified citation.
              </p>
            </div>

            {/* Live Mini-UI */}
            <div className="rounded-lg border border-border bg-elevated/70 p-4 font-mono text-xs space-y-2.5">
              <div className="flex items-center justify-between text-muted text-[11px] pb-2 border-b border-border/40">
                <span>Quote Verification Inspector</span>
                <span className="text-verified">Status: Verified (p. 18)</span>
              </div>
              <div className="text-text leading-relaxed bg-surface/80 p-3 rounded border border-border">
                &quot;The governing law of this Agreement shall be the laws of the State of
                Delaware, without regard to conflict of laws principles.&quot;
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Byte Offsets: 82,901 – 83,044</span>
                <span className="text-verified flex items-center gap-1 font-semibold">
                  <Check className="h-3 w-3" /> 143 characters confirmed
                </span>
              </div>
            </div>
          </SpotlightCard>

          {/* 2. Click-to-Highlight Citations (4 cols) */}
          <SpotlightCard className="md:col-span-4 p-6 sm:p-8 flex flex-col justify-between">
            <div className="mb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold block mb-3">
                Interactive Grounding
              </span>
              <h3 className="text-xl font-semibold text-text mb-2">
                Click-to-Highlight Citations
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Click any citation tag in the answer to scroll the contract directly to the original line.
              </p>
            </div>

            {/* Live Mini-UI */}
            <div className="rounded-lg border border-border bg-elevated/70 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Try clicking citation chip:</span>
                <button
                  onClick={() => setHighlightActive(!highlightActive)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                    highlightActive
                      ? "bg-accent text-white shadow-md shadow-accent/20"
                      : "bg-surface text-muted border border-border"
                  }`}
                >
                  [1]
                </button>
              </div>

              <div className="p-3 rounded border border-border bg-surface text-[11px] text-muted font-mono leading-relaxed transition-colors">
                Section 4.1 Notice. Notice must be delivered by certified mail{" "}
                <span
                  className={`px-1 py-0.5 rounded transition-all duration-300 ${
                    highlightActive
                      ? "bg-accent/30 text-white border border-accent"
                      : "bg-transparent text-muted"
                  }`}
                >
                  or courier within 5 business days
                </span>
                .
              </div>
            </div>
          </SpotlightCard>

          {/* 3. Ask Across Several Documents (4 cols) */}
          <SpotlightCard className="md:col-span-4 p-6 sm:p-8 flex flex-col justify-between">
            <div className="mb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold block mb-3">
                Multi-Contract Graph
              </span>
              <h3 className="text-xl font-semibold text-text mb-2">
                Cross-Document Queries
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Interrogate master agreements, amendments, and order forms simultaneously in a single session.
              </p>
            </div>

            {/* Live Mini-UI */}
            <div className="space-y-2">
              {[
                { id: "doc1", name: "MSA_Core_2025.pdf", pages: "38 pages" },
                { id: "doc2", name: "Amendment_No_2.docx", pages: "4 pages" },
                { id: "doc3", name: "Order_Form_SaaS.pdf", pages: "12 pages" },
              ].map((doc) => {
                const isSelected = selectedDocs.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                      isSelected
                        ? "border-accent/50 bg-accent/10 text-text"
                        : "border-border/60 bg-surface/40 text-muted hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText
                        className={`h-3.5 w-3.5 ${
                          isSelected ? "text-accent" : "text-muted"
                        }`}
                      />
                      <span className="truncate">{doc.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted shrink-0">
                      {doc.pages}
                    </span>
                  </button>
                );
              })}
            </div>
          </SpotlightCard>

          {/* 4. Compare Contract Versions (8 cols) */}
          <SpotlightCard className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-between">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                  Automated Redlines
                </span>
                <Badge variant="outline" className="text-[11px] gap-1">
                  <GitCompare className="h-3 w-3" /> Semantic Diff
                </Badge>
              </div>
              <h3 className="text-xl font-semibold text-text mb-2">
                Version Comparison with Significance Ranking
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
                Compare baseline and revised agreements. Changes are automatically categorized into
                Critical, Major, Minor, and Cosmetic so you never miss a stealth liability adjustment.
              </p>
            </div>

            {/* Live Mini-UI */}
            <div className="rounded-lg border border-border bg-elevated/70 p-4 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <Badge className="bg-danger/20 text-danger border-danger/40 text-[10px]">
                  CRITICAL
                </Badge>
                <span className="text-muted text-[11px]">Section 12.2 • Liability Cap</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded border border-border/80 bg-danger/10 text-text">
                  <span className="text-muted block text-[10px] mb-1 font-sans">
                    Baseline Document:
                  </span>
                  &quot;Liability capped at AED 100,000.&quot;
                </div>
                <div className="p-2.5 rounded border border-border/80 bg-verified/10 text-text">
                  <span className="text-muted block text-[10px] mb-1 font-sans">
                    Revised Document:
                  </span>
                  &quot;Liability capped at AED 1,000,000.&quot;
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* 5. Agentic Research with Visible Tool Steps (6 cols) */}
          <SpotlightCard className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
            <div className="mb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold block mb-3">
                Transparent Execution
              </span>
              <h3 className="text-xl font-semibold text-text mb-2">
                Agentic Tool Traces
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Watch every retrieval step and verification pass happen in an inspection trace. No opaque guesses.
              </p>
            </div>

            {/* Live Mini-UI */}
            <div className="rounded-lg border border-border bg-elevated/80 p-3.5 space-y-2 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-muted">
                <Terminal className="h-3.5 w-3.5 text-accent" />
                <span>tool_execution_trace</span>
              </div>
              <div className="space-y-1.5 text-muted">
                <div className="flex items-center justify-between p-1.5 rounded bg-surface border border-border/40">
                  <span className="text-text">01. search_index(&quot;indemnification&quot;)</span>
                  <span className="text-verified text-[10px]">found 4 chunks</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-surface border border-border/40">
                  <span className="text-text">02. verify_citation(quote, offset: 28100)</span>
                  <span className="text-verified text-[10px]">100% match</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-surface border border-border/40">
                  <span className="text-text">03. synthesize_response()</span>
                  <span className="text-accent text-[10px]">complete</span>
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* 6. Honest Coverage Transparency (6 cols) */}
          <SpotlightCard className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
            <div className="mb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold block mb-3">
                Zero Blind Spots
              </span>
              <h3 className="text-xl font-semibold text-text mb-2">
                Large Documents & Coverage Honesty
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                We handle 150+ page agreements. If a page was blank, illegible, or failed extraction, we tell you explicitly.
              </p>
            </div>

            {/* Live Mini-UI */}
            <div className="rounded-lg border border-border bg-elevated/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text">Coverage Audit</span>
                <Badge
                  variant="outline"
                  className="border-verified/40 bg-verified/10 text-verified font-mono text-[11px]"
                >
                  Read 148 of 148 pages
                </Badge>
              </div>

              {/* Segmented Coverage Bar */}
              <div className="grid grid-cols-12 gap-1 h-3 rounded-full bg-surface p-0.5 border border-border">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full rounded-sm bg-verified/80"
                    title={`Pages ${i * 12 + 1}–${(i + 1) * 12}`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                <span>0 unreadable pages</span>
                <span className="text-verified">100% extraction complete</span>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}

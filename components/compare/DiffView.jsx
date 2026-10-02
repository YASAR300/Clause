"use client";

import { useMemo } from "react";
import { computeWordDiff } from "@/lib/compare/diff";

/**
 * Renders an inline word-level diff and side-by-side clause inspection.
 * Insertions are green, deletions are red line-through.
 */
export function DiffView({ baseText = "", revisedText = "", viewMode = "split" }) {
  const diffTokens = useMemo(() => {
    return computeWordDiff(baseText || "", revisedText || "");
  }, [baseText, revisedText]);

  if (!baseText && !revisedText) {
    return (
      <div className="p-4 text-xs text-muted italic">
        No text content recorded for this clause.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-[#0c0c0e] overflow-hidden text-xs">
      {/* View Mode Toggle Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-[#121215] text-[11px] text-muted">
        <span className="font-mono uppercase tracking-wider font-semibold">
          Clause Redline Diff
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ef4444]/30 border border-[#ef4444]" />
            <span>Deleted</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#10b981]/30 border border-[#10b981]" />
            <span>Added</span>
          </span>
        </div>
      </div>

      {viewMode === "split" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Base Document Pane */}
          <div className="p-4 space-y-2 bg-[#0c0c0e]">
            <div className="text-[10px] font-mono font-semibold uppercase text-muted tracking-wider flex items-center justify-between">
              <span>Base (Original)</span>
              {baseText ? (
                <span className="text-[10px] text-muted">{baseText.length} chars</span>
              ) : (
                <span className="text-[#10b981]">None (Added in revised)</span>
              )}
            </div>
            {baseText ? (
              <p className="text-xs text-text/90 leading-relaxed font-sans whitespace-pre-wrap selection:bg-[#3b82f6]/20">
                {diffTokens.map((token, i) => {
                  if (token.type === "added") return null;
                  if (token.type === "removed") {
                    return (
                      <span
                        key={i}
                        className="bg-[#ef4444]/20 text-[#fca5a5] line-through decoration-[#ef4444] px-0.5 rounded"
                      >
                        {token.value}
                      </span>
                    );
                  }
                  return <span key={i}>{token.value}</span>;
                })}
              </p>
            ) : (
              <p className="text-xs text-muted italic">This clause was newly introduced.</p>
            )}
          </div>

          {/* Revised Document Pane */}
          <div className="p-4 space-y-2 bg-[#0c0c0e]">
            <div className="text-[10px] font-mono font-semibold uppercase text-muted tracking-wider flex items-center justify-between">
              <span>Revised (Newer)</span>
              {revisedText ? (
                <span className="text-[10px] text-muted">{revisedText.length} chars</span>
              ) : (
                <span className="text-[#ef4444]">None (Removed from revised)</span>
              )}
            </div>
            {revisedText ? (
              <p className="text-xs text-text/90 leading-relaxed font-sans whitespace-pre-wrap selection:bg-[#3b82f6]/20">
                {diffTokens.map((token, i) => {
                  if (token.type === "removed") return null;
                  if (token.type === "added") {
                    return (
                      <span
                        key={i}
                        className="bg-[#10b981]/20 text-[#86efac] font-medium px-0.5 rounded"
                      >
                        {token.value}
                      </span>
                    );
                  }
                  return <span key={i}>{token.value}</span>;
                })}
              </p>
            ) : (
              <p className="text-xs text-muted italic">This clause was deleted.</p>
            )}
          </div>
        </div>
      ) : (
        /* Unified Inline Diff Pane */
        <div className="p-4 bg-[#0c0c0e]">
          <p className="text-xs text-text/90 leading-relaxed font-sans whitespace-pre-wrap selection:bg-[#3b82f6]/20">
            {diffTokens.map((token, i) => {
              if (token.type === "removed") {
                return (
                  <span
                    key={i}
                    className="bg-[#ef4444]/20 text-[#fca5a5] line-through decoration-[#ef4444] px-0.5 rounded mx-0.5"
                  >
                    {token.value}
                  </span>
                );
              }
              if (token.type === "added") {
                return (
                  <span
                    key={i}
                    className="bg-[#10b981]/20 text-[#86efac] font-medium px-0.5 rounded mx-0.5"
                  >
                    {token.value}
                  </span>
                );
              }
              return <span key={i}>{token.value}</span>;
            })}
          </p>
        </div>
      )}
    </div>
  );
}

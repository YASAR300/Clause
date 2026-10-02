"use client";

import { FileText, CheckCircle2, AlertTriangle } from "lucide-react";

/**
 * Renders a compact list of all sources and citations used in an assistant answer,
 * grouped by document.
 */
export function SourcesList({ citations = [] }) {
  if (!citations || citations.length === 0) return null;

  // Group citations by document
  const grouped = new Map();

  for (const cite of citations) {
    const docKey = cite.documentId || "Unknown";
    const docName = cite.documentName || "Referenced Contract";

    if (!grouped.has(docKey)) {
      grouped.set(docKey, { name: docName, list: [] });
    }
    grouped.get(docKey).list.push(cite);
  }

  return (
    <div className="mt-4 pt-3 border-t border-[#27272a]/60 space-y-2 text-xs">
      <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] font-medium flex items-center gap-1.5">
        <FileText className="h-3 w-3" />
        <span>Referenced Sources ({citations.length})</span>
      </div>

      <div className="space-y-2.5">
        {Array.from(grouped.entries()).map(([docId, { name, list }]) => (
          <div
            key={docId}
            className="p-2.5 rounded-md bg-[#121214] border border-[#27272a] space-y-2"
          >
            <div className="font-medium text-[#ededed] text-xs flex items-center justify-between">
              <span className="truncate">{name}</span>
              <span className="text-[10px] font-mono text-[#71717a]">
                {list.length} {list.length === 1 ? "quote" : "quotes"}
              </span>
            </div>

            <div className="space-y-1.5">
              {list.map((c) => {
                const pageLabel =
                  c.pageStart === c.pageEnd
                    ? `p. ${c.pageStart}`
                    : `pp. ${c.pageStart}–${c.pageEnd}`;

                return (
                  <div
                    key={c.ordinal}
                    className="flex items-start gap-2 p-1.5 rounded bg-[#18181b] border border-[#27272a]/60 text-[11px]"
                  >
                    <span className="font-mono font-semibold text-[#a1a1aa] shrink-0 mt-0.5">
                      [{c.ordinal}]
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[#d4d4d8] leading-relaxed line-clamp-2">
                        &ldquo;{c.quoteText}&rdquo;
                      </p>

                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        {c.verified ? (
                          <span className="inline-flex items-center gap-1 text-[#10b981]">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Verified ({pageLabel})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#f59e0b]">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Unverified ({c.failureReason || "Not found"})
                          </span>
                        )}

                        {c.matchCount > 1 && (
                          <span className="text-[#71717a]">
                            • {c.matchCount} occurrences
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

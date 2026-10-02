"use client";

import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

/**
 * Renders the compact coverage indicator bar under every assistant answer.
 */
export function CoverageIndicator({ coverage }) {
  if (!coverage) return null;

  const isComplete = Boolean(coverage.complete);
  const totalChunks = coverage.totalChunks || 0;
  const chunksRead = coverage.chunksRead || 0;
  const percent =
    totalChunks > 0 ? Math.min(100, Math.round((chunksRead / totalChunks) * 100)) : 100;

  const summaryText =
    coverage.totalPages && coverage.totalPages > 1
      ? `Reviewed ${coverage.pagesRead?.length ? "specified" : "all"} pages of ${coverage.totalPages}`
      : `Reviewed ${chunksRead} of ${totalChunks} contract sections`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md bg-[#121214] border border-[#27272a] text-xs">
      <div className="flex items-center gap-2">
        {isComplete ? (
          <ShieldCheck className="h-3.5 w-3.5 text-[#10b981] shrink-0" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-[#f59e0b] shrink-0" />
        )}

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-[#a1a1aa]">{summaryText}</span>
          <span className="text-[#71717a]">•</span>
          <span
            className={
              isComplete
                ? "text-[#10b981] font-medium"
                : "text-[#f59e0b] font-medium"
            }
          >
            {isComplete ? "Complete Audit" : "Partial Review"}
          </span>
        </div>
      </div>

      {/* Mini Progress Bar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-20 h-1.5 bg-[#27272a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete ? "bg-[#10b981]" : "bg-[#f59e0b]"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-[#71717a]">
          {percent}%
        </span>
      </div>
    </div>
  );
}

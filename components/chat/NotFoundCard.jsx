"use client";

import { AlertCircle, HelpCircle, ShieldAlert } from "lucide-react";
import { formatPageRanges } from "@/lib/retrieval";

/**
 * Renders the NotFound state card when a question cannot be answered from the document.
 */
export function NotFoundCard({ explanation, coverage }) {
  const isComplete = Boolean(coverage?.complete);
  const chunksRead = coverage?.chunksRead || 0;
  const totalChunks = coverage?.totalChunks || 0;
  const pagesDesc = formatPageRanges(coverage?.pagesRead || []);

  return (
    <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-[#27272a] flex items-center justify-center shrink-0 text-[#f59e0b]">
          <HelpCircle className="h-4 w-4" />
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-[#ededed]">
            This isn&apos;t in the document
          </h4>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            {explanation ||
              "Clause could not find provisions answering this inquiry within the reviewed excerpts."}
          </p>
        </div>
      </div>

      {/* Coverage Status Warning */}
      {!isComplete ? (
        <div className="p-2.5 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-start gap-2 text-xs text-[#f59e0b]">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed text-[11px]">
            <p className="font-semibold">Partial Coverage Warning</p>
            <p>
              Only {chunksRead} of {totalChunks} sections were reviewed ({pagesDesc}).
              This is not confirmation that the term is absent from the entire contract.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded bg-[#10b981]/10 border border-[#10b981]/20 flex items-center gap-2 text-xs text-[#10b981]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            All {coverage.totalPages} pages of the agreement were audited exhaustively. The term is absent from the contract.
          </p>
        </div>
      )}
    </div>
  );
}

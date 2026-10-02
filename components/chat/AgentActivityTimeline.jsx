"use client";

import { useState } from "react";
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Search,
  FileText,
  ListTree,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Agent activity timeline component.
 * Displays live step-by-step tool execution during deep research,
 * and collapses into a concise summary once completed.
 */
export function AgentActivityTimeline({
  toolTrace = [],
  isStreaming = false,
  activeRound = null,
}) {
  const [isExpanded, setIsExpanded] = useState(isStreaming);
  const [expandedStepIds, setExpandedStepIds] = useState(new Set());

  if (!toolTrace || toolTrace.length === 0) {
    if (isStreaming) {
      return (
        <div className="p-3 rounded-lg border border-[#3b82f6]/30 bg-[#3b82f6]/10 flex items-center gap-2.5 text-xs text-[#3b82f6]">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span className="font-medium">Initializing agent research plan...</span>
        </div>
      );
    }
    return null;
  }

  const totalSteps = toolTrace.length;
  const totalDurationMs = toolTrace.reduce(
    (acc, step) => acc + (step.durationMs || 0),
    0
  );
  const formattedDuration =
    totalDurationMs > 1000
      ? `${(totalDurationMs / 1000).toFixed(1)}s`
      : `${totalDurationMs}ms`;

  const toggleStepJson = (id) => {
    setExpandedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getToolIcon = (name) => {
    switch (name) {
      case "search_document":
        return Search;
      case "list_clauses":
        return ListTree;
      case "get_section":
      case "get_pages":
        return FileText;
      default:
        return Compass;
    }
  };

  return (
    <div className="rounded-lg border border-[#27272a] bg-[#101014] overflow-hidden text-xs my-2">
      {/* Summary Header / Collapse Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3.5 py-2 flex items-center justify-between bg-[#141418] hover:bg-[#18181f] text-left transition-colors select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-5 w-5 rounded bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center shrink-0">
            {isStreaming ? (
              <Loader2 className="h-3 w-3 animate-spin text-[#3b82f6]" />
            ) : (
              <Compass className="h-3 w-3 text-[#3b82f6]" />
            )}
          </div>

          <span className="font-medium text-[#ededed]">
            {isStreaming
              ? `Researching contracts (Step ${totalSteps}${activeRound ? `, Round ${activeRound}` : ""})...`
              : `Researched in ${totalSteps} ${totalSteps === 1 ? "step" : "steps"}`}
          </span>

          <span className="text-[10px] text-[#71717a] font-mono">
            • {formattedDuration}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-[#71717a]">
            {isExpanded ? "Hide trace" : "View steps"}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#71717a]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#71717a]" />
          )}
        </div>
      </button>

      {/* Expanded Timeline Steps */}
      {isExpanded && (
        <div className="p-3 space-y-2 border-t border-[#222226] bg-[#0c0c0e]">
          {toolTrace.map((step, idx) => {
            const Icon = getToolIcon(step.name);
            const isLast = idx === totalSteps - 1;
            const isRunning = isStreaming && isLast && !step.summary;
            const showJson = expandedStepIds.has(step.id);

            return (
              <div
                key={step.id || idx}
                className="relative flex items-start gap-2.5 pl-1 text-xs"
              >
                {/* Status Icon */}
                <div className="mt-0.5 shrink-0">
                  {isRunning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3b82f6]" />
                  ) : step.ok === false ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-[#f59e0b]" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981]" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium text-[#d4d4d8] leading-tight">
                      {step.humanLabel || step.name}
                    </span>

                    {step.durationMs != null && (
                      <span className="text-[10px] font-mono text-[#71717a]">
                        {step.durationMs}ms
                      </span>
                    )}
                  </div>

                  {step.summary && (
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#71717a]">
                      <span>{step.summary}</span>

                      {step.result && (
                        <button
                          type="button"
                          onClick={() => toggleStepJson(step.id)}
                          className="hover:text-[#ededed] text-[10px] font-mono inline-flex items-center gap-1 underline decoration-dotted"
                        >
                          <Code2 className="h-2.5 w-2.5" />
                          <span>{showJson ? "hide raw" : "inspect"}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Collapsible raw JSON result */}
                  {showJson && step.result && (
                    <pre className="p-2 rounded bg-[#141418] border border-[#27272a] text-[10px] font-mono text-[#a1a1aa] overflow-x-auto max-h-40 leading-relaxed mt-1 scrollbar-thin">
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

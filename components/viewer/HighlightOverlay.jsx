"use client";

import { useEffect, useState } from "react";

/**
 * Renders per-line highlight bounding boxes over a page container.
 * Features a glowing pulse animation on mount and dismisses on click or Escape.
 */
export function HighlightOverlay({
  rects = [],
  active = true,
  matchIndex = 0,
  totalMatches = 1,
  onDismiss,
}) {
  const [pulsing, setPulsing] = useState(true);

  useEffect(() => {
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 2400);
    return () => clearTimeout(timer);
  }, [rects]);

  if (!rects.length) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      aria-label={`Citation highlight${totalMatches > 1 ? ` (Match ${matchIndex + 1} of ${totalMatches})` : ""}`}
    >
      {rects.map((rect, idx) => {
        const isFirst = idx === 0;
        return (
          <div
            key={idx}
            style={{
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
            }}
            className={`absolute rounded transition-all duration-300 pointer-events-auto cursor-pointer ${
              active
                ? "bg-[#3b82f6]/35 border border-[#3b82f6]/70 shadow-[0_0_12px_rgba(59,130,246,0.35)]"
                : "bg-[#f59e0b]/20 border border-[#f59e0b]/40"
            } ${pulsing ? "animate-pulse ring-2 ring-[#3b82f6]/60" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss?.();
            }}
            title="Click to dismiss highlight"
          >
            {/* Occurrence Badge on first rect */}
            {isFirst && totalMatches > 1 && (
              <div className="absolute -top-6 left-0 bg-[#18181b] border border-[#27272a] text-[#ededed] font-mono text-[10px] px-1.5 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                Match {matchIndex + 1} of {totalMatches}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

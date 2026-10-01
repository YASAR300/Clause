"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  BookOpen,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Clock,
  RotateCw,
  HelpCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STAGES = [
  { key: "UPLOADING", label: "Uploading", icon: Upload },
  { key: "EXTRACTING", label: "Reading pages", icon: BookOpen },
  { key: "INDEXING", label: "Indexing", icon: Cpu },
  { key: "READY", label: "Ready", icon: CheckCircle2 },
];

export function ProcessingStepper({
  status,
  progress = 0,
  statusDetail = "",
  startTime = null,
  emptyPages = [],
  onRetry = null,
  compact = false,
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime || status === "READY" || status === "FAILED" || status === "NEEDS_OCR") {
      return;
    }
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, status]);

  // Determine active stage index
  let activeIndex = 0;
  if (status === "UPLOADING" || status === "QUEUED") activeIndex = 0;
  else if (status === "EXTRACTING") activeIndex = 1;
  else if (status === "INDEXING") activeIndex = 2;
  else if (status === "READY") activeIndex = 3;

  if (status === "NEEDS_OCR") {
    return (
      <div className="rounded-lg border border-unverified/30 bg-unverified/5 p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-unverified">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Needs OCR (Scanned Document)</span>
          </div>
          <Badge variant="outline" className="border-unverified/40 bg-unverified/10 text-unverified text-[10px] font-mono">
            Scanned
          </Badge>
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          {statusDetail || "This PDF looks scanned: it has no selectable text, so Clause can't read it. Upload a text-based version or run OCR first."}
        </p>

        <div className="flex items-center gap-2 pt-1 text-[11px]">
          <span className="text-muted font-mono">Tip: Re-save document using searchable PDF output or native Word file.</span>
        </div>
      </div>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-danger">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>Processing Failed</span>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-6 px-2 text-[10px] text-danger border-danger/30 hover:bg-danger/10 gap-1"
            >
              <RotateCw className="h-3 w-3" />
              Retry
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          {statusDetail || "Could not parse agreement. Ensure the file is not password-protected or corrupt."}
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {status === "READY" ? (
          <Badge variant="outline" className="border-verified/30 bg-verified/10 text-verified text-[10px] font-mono gap-1 py-0.5">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </Badge>
        ) : (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-accent" />
            <span className="text-[11px] text-muted font-mono">
              {statusDetail || STAGES[activeIndex].label}
            </span>
            {progress > 0 && <span className="text-[10px] text-accent font-mono font-semibold">{progress}%</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Stepper bubbles */}
      <div className="flex items-center justify-between gap-1">
        {STAGES.map((stg, i) => {
          const isDone = i < activeIndex || status === "READY";
          const isCurrent = i === activeIndex && status !== "READY";
          const Icon = stg.icon;

          return (
            <div key={stg.key} className="flex items-center gap-1.5 flex-1 min-w-0">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-colors ${
                  isDone
                    ? "bg-verified/20 text-verified border border-verified/40"
                    : isCurrent
                    ? "bg-accent text-white ring-2 ring-accent/20"
                    : "bg-surface-hover text-muted/60 border border-border"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : isCurrent ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>

              <span
                className={`text-[10px] truncate hidden sm:inline ${
                  isDone
                    ? "text-text font-medium"
                    : isCurrent
                    ? "text-accent font-semibold"
                    : "text-muted/60"
                }`}
              >
                {stg.label}
              </span>

              {i < STAGES.length - 1 && (
                <div
                  className={`h-px flex-1 ml-1 ${
                    i < activeIndex ? "bg-verified/40" : "bg-border/60"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Determinate progress bar */}
      {status !== "READY" && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1 bg-surface-hover" />
          <div className="flex items-center justify-between text-[10px] text-muted font-mono pt-0.5">
            <span className="truncate pr-2 text-text/80">
              {statusDetail || `${STAGES[activeIndex].label}...`}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {elapsed > 0 && (
                <span className="flex items-center gap-1 opacity-70">
                  <Clock className="h-2.5 w-2.5" />
                  {elapsed}s
                </span>
              )}
              <span className="font-semibold text-accent">{progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Partial empty pages warning */}
      {status === "READY" && emptyPages && emptyPages.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-unverified bg-unverified/10 border border-unverified/20 rounded px-2 py-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Pages {emptyPages.join(", ")} have no readable text and are not searchable.</span>
        </div>
      )}
    </div>
  );
}

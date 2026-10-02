"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Scan,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const STEPS = [
  { id: "UPLOADED", label: "Uploaded" },
  { id: "EXTRACTING", label: "Reading pages" },
  { id: "INDEXING", label: "Indexing offsets" },
  { id: "READY", label: "Ready to audit" },
];

/**
 * Displayed when a document is not in READY status.
 * Shows an active processing stepper or the NEEDS_OCR / FAILED explanation.
 */
export function UnreadyState({ document, onRetry }) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      const res = await fetch(`/api/documents/${document.id}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to trigger retry");
      toast.success("Document re-queued for processing");
      onRetry?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsRetrying(false);
    }
  };

  const isOcr = document.status === "NEEDS_OCR";
  const isFailed = document.status === "FAILED";

  const getStepStatus = (stepId, currentStatus) => {
    const order = ["UPLOADED", "EXTRACTING", "INDEXING", "READY"];
    const currentIdx = order.indexOf(currentStatus);
    const stepIdx = order.indexOf(stepId);

    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "active";
    return "upcoming";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] h-full p-8 text-center max-w-lg mx-auto space-y-6">
      {isOcr ? (
        <div className="space-y-4">
          <div className="h-12 w-12 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b] mx-auto">
            <Scan className="h-6 w-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#ededed]">
              Scanned Contract (Needs OCR)
            </h2>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              &ldquo;{document.name}&rdquo; consists of scanned images without embedded text layers. Optical Character Recognition (OCR) is required before exact character offsets can be audited.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Button size="sm" variant="outline" asChild className="text-xs">
              <Link href="/documents">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Documents
              </Link>
            </Button>
          </div>
        </div>
      ) : isFailed ? (
        <div className="space-y-4">
          <div className="h-12 w-12 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 flex items-center justify-center text-[#ef4444] mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#ededed]">
              Processing Interrupted
            </h2>
            <p className="text-xs text-[#ef4444] leading-relaxed">
              {document.failureReason || "Could not complete text indexing for this file."}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white gap-1.5"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              Retry indexing
            </Button>
            <Button size="sm" variant="outline" asChild className="text-xs">
              <Link href="/documents">Back to Library</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-6">
          <div className="space-y-1.5">
            <div className="h-12 w-12 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] mx-auto mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-[#ededed] truncate">
              {document.name}
            </h2>
            <p className="text-xs text-[#71717a]">
              Preparing document and building character index for quote verification...
            </p>
          </div>

          {/* Stepper */}
          <div className="p-4 rounded-xl bg-[#121215] border border-[#222226] space-y-3 text-left">
            {STEPS.map((step) => {
              const status = getStepStatus(step.id, document.status);
              return (
                <div key={step.id} className="flex items-center gap-3 text-xs">
                  {status === "completed" && (
                    <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
                  )}
                  {status === "active" && (
                    <Loader2 className="h-4 w-4 animate-spin text-[#3b82f6] shrink-0" />
                  )}
                  {status === "upcoming" && (
                    <div className="h-4 w-4 rounded-full border border-[#27272a] shrink-0" />
                  )}

                  <span
                    className={
                      status === "active"
                        ? "text-[#ededed] font-medium"
                        : status === "completed"
                        ? "text-[#a1a1aa]"
                        : "text-[#52525b]"
                    }
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { CheckCircle2, AlertCircle, FileSearch, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CoverageHonesty() {
  return (
    <section className="py-20 border-b border-border/60 bg-surface/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-surface/80 p-8 sm:p-12 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-7 space-y-4">
              <Badge variant="outline" className="border-border bg-surface px-2.5 py-0.5 text-xs text-muted">
                Audit Integrity
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text">
                We tell you what we didn&apos;t read.
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                Most contract tools silently skip pages when extraction fails or prompt
                windows get tight. Clause tracks character offsets per page and exposes
                every unreadable scan, blank page, or skipped annex so your liability review is never compromised.
              </p>

              <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-muted">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-verified" />
                  <span>Exact page tracking</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-verified" />
                  <span>Blank page audit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-verified" />
                  <span>OCR quality warnings</span>
                </div>
              </div>
            </div>

            {/* Right Coverage Bar Visual */}
            <div className="lg:col-span-5 rounded-xl border border-border bg-elevated/70 p-5 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between text-muted text-[11px] pb-2 border-b border-border/40">
                <span>Extraction Audit Log</span>
                <span className="text-verified">148 / 148 Pages Indexed</span>
              </div>

              {/* Progress Bar Segments */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-muted">
                  <span>Full Text Completeness</span>
                  <span className="text-text font-bold">100%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-surface border border-border/80 overflow-hidden flex">
                  <div className="h-full w-full bg-verified" title="100% Pages Indexed" />
                </div>
              </div>

              {/* Details Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                <div className="p-2 rounded bg-surface border border-border">
                  <span className="text-muted block text-[10px]">Readable Text:</span>
                  <span className="text-text font-bold">324,810 chars</span>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <span className="text-muted block text-[10px]">Empty Pages:</span>
                  <span className="text-text font-bold">Page 14, 29 (Blank)</span>
                </div>
              </div>

              <p className="text-[10px] text-muted/80 font-sans">
                No invisible omissions. If any text is skipped, it is flagged on screen before answers are formed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

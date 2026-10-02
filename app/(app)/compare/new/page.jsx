"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  GitCompare,
  ArrowRight,
  FileText,
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function NewComparisonPage() {
  const router = useRouter();
  const [mode, setMode] = useState("library"); // "library" | "upload"

  // Library selection state
  const [baseDocId, setBaseDocId] = useState("");
  const [revisedDocId, setRevisedDocId] = useState("");

  // Direct upload state
  const [baseFile, setBaseFile] = useState(null);
  const [revisedFile, setRevisedFile] = useState(null);
  const [uploadingState, setUploadingState] = useState({
    uploading: false,
    stage: "",
    progress: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available ready documents
  const { data: docsData, isLoading: docsLoading } = useSWR(
    "/api/documents?status=READY&limit=100",
    fetcher
  );
  const readyDocs = docsData?.items || [];

  const handleCreateComparison = async (bId, rId) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseDocumentId: bId, revisedDocumentId: rId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to initiate comparison");
      }

      toast.success("Comparison queued successfully");
      router.push(`/compare/${data.comparison.id}`);
    } catch (err) {
      toast.error(err.message || "Failed to create comparison");
      setIsSubmitting(false);
    }
  };

  const handleLibrarySubmit = (e) => {
    e.preventDefault();
    if (!baseDocId || !revisedDocId) {
      toast.error("Please select both a base contract and a revised contract");
      return;
    }
    if (baseDocId === revisedDocId) {
      toast.error("Base and revised documents must be distinct contracts");
      return;
    }
    handleCreateComparison(baseDocId, revisedDocId);
  };

  // Helper to upload a single file via /api/documents/upload fallback or direct
  const uploadContractFile = async (file, label) => {
    setUploadingState((prev) => ({
      ...prev,
      stage: `Uploading ${label} (${file.name})...`,
    }));

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `Failed to upload ${label}`);
    }

    const docId = data.document.id;

    // Poll until ready
    let attempts = 0;
    while (attempts < 60) {
      attempts++;
      setUploadingState((prev) => ({
        ...prev,
        stage: `Processing ${label} text & clauses... (${attempts}s)`,
      }));
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await fetch(`/api/documents/${docId}/status`);
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        if (statusJson.status === "READY") {
          return docId;
        }
        if (statusJson.status === "FAILED" || statusJson.status === "NEEDS_OCR") {
          return docId; // proceed even if partial
        }
      }
    }
    return docId;
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!baseFile || !revisedFile) {
      toast.error("Please choose both an original (base) file and a revised file");
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadingState({ uploading: true, stage: "Starting document uploads...", progress: 10 });

      const uploadedBaseId = await uploadContractFile(baseFile, "Original Contract");
      const uploadedRevisedId = await uploadContractFile(revisedFile, "Revised Version");

      setUploadingState({ uploading: true, stage: "Launching clause comparison...", progress: 90 });
      await handleCreateComparison(uploadedBaseId, uploadedRevisedId);
    } catch (err) {
      toast.error(err.message || "Failed to upload and compare files");
      setUploadingState({ uploading: false, stage: "", progress: 0 });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-2">
      <PageHeader
        breadcrumbs={[
          { label: "Clause", href: "/dashboard" },
          { label: "Compare", href: "/compare" },
          { label: "New Comparison" },
        ]}
        title="Compare Contract Versions"
        description="Select or upload two agreements to perform automated clause alignment, deterministic fact extraction, and risk classification."
      />

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#222226] pb-4">
        <button
          type="button"
          onClick={() => setMode("library")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            mode === "library"
              ? "bg-[#18181b] text-text border border-[#27272a] shadow-sm"
              : "text-muted hover:text-text hover:bg-surface"
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-[#3b82f6]" />
          Choose from Library
        </button>

        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            mode === "upload"
              ? "bg-[#18181b] text-text border border-[#27272a] shadow-sm"
              : "text-muted hover:text-text hover:bg-surface"
          }`}
        >
          <UploadCloud className="h-3.5 w-3.5 text-[#10b981]" />
          Upload Two Files
        </button>
      </div>

      {mode === "library" ? (
        <form onSubmit={handleLibrarySubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Document Card */}
            <div className="p-5 rounded-xl border border-border bg-[#121215] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text uppercase tracking-wider">
                  Base Document (Original)
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-border text-muted">
                  Version 1 / Baseline
                </Badge>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                The reference agreement or initial draft. All deletions and clause drifts are evaluated relative to this document.
              </p>

              <div>
                <label className="text-xs font-medium text-text block mb-1.5">
                  Select Base Contract
                </label>
                <select
                  value={baseDocId}
                  onChange={(e) => setBaseDocId(e.target.value)}
                  className="w-full h-10 rounded-lg bg-[#0c0c0e] border border-border px-3 text-xs text-text focus:outline-none focus:border-[#3b82f6]"
                  disabled={isSubmitting || docsLoading}
                >
                  <option value="">Choose original contract...</option>
                  {readyDocs.map((doc) => (
                    <option key={doc.id} value={doc.id} disabled={doc.id === revisedDocId}>
                      {doc.name} {doc.pageCount ? `(${doc.pageCount} pages)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {baseDocId && (
                <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] text-xs text-text flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-[#3b82f6] shrink-0" />
                  <span className="truncate font-medium">
                    {readyDocs.find((d) => d.id === baseDocId)?.name}
                  </span>
                </div>
              )}
            </div>

            {/* Revised Document Card */}
            <div className="p-5 rounded-xl border border-border bg-[#121215] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text uppercase tracking-wider">
                  Revised Document (Newer)
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-border text-[#10b981]">
                  Version 2 / Counterpart
                </Badge>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                The updated version, redline, or counterparty marked-up agreement to analyze against the base.
              </p>

              <div>
                <label className="text-xs font-medium text-text block mb-1.5">
                  Select Revised Contract
                </label>
                <select
                  value={revisedDocId}
                  onChange={(e) => setRevisedDocId(e.target.value)}
                  className="w-full h-10 rounded-lg bg-[#0c0c0e] border border-border px-3 text-xs text-text focus:outline-none focus:border-[#3b82f6]"
                  disabled={isSubmitting || docsLoading}
                >
                  <option value="">Choose revised contract...</option>
                  {readyDocs.map((doc) => (
                    <option key={doc.id} value={doc.id} disabled={doc.id === baseDocId}>
                      {doc.name} {doc.pageCount ? `(${doc.pageCount} pages)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {revisedDocId && (
                <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] text-xs text-text flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-[#10b981] shrink-0" />
                  <span className="truncate font-medium">
                    {readyDocs.find((d) => d.id === revisedDocId)?.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/compare")}
              className="text-xs"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!baseDocId || !revisedDocId || baseDocId === revisedDocId || isSubmitting}
              className="text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white gap-2 shadow-sm font-medium h-9 px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Queuing Comparison...
                </>
              ) : (
                <>
                  <GitCompare className="h-3.5 w-3.5" />
                  Run Redline & Clause Diff
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleUploadSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Base */}
            <div className="p-5 rounded-xl border border-border bg-[#121215] space-y-4">
              <span className="text-xs font-semibold text-text uppercase tracking-wider block">
                Original Contract (Base)
              </span>
              <p className="text-xs text-muted">PDF or DOCX document to use as the baseline.</p>

              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#27272a] hover:border-[#3b82f6] rounded-xl cursor-pointer bg-[#0c0c0e] transition-colors">
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setBaseFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <UploadCloud className="h-7 w-7 text-muted mb-2" />
                <span className="text-xs font-medium text-text">
                  {baseFile ? baseFile.name : "Choose original file"}
                </span>
                <span className="text-[10px] text-muted mt-1">PDF or DOCX up to 50MB</span>
              </label>
            </div>

            {/* Upload Revised */}
            <div className="p-5 rounded-xl border border-border bg-[#121215] space-y-4">
              <span className="text-xs font-semibold text-text uppercase tracking-wider block">
                Revised Version (Newer)
              </span>
              <p className="text-xs text-muted">The counterpart or updated version to compare.</p>

              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#27272a] hover:border-[#10b981] rounded-xl cursor-pointer bg-[#0c0c0e] transition-colors">
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setRevisedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <UploadCloud className="h-7 w-7 text-muted mb-2" />
                <span className="text-xs font-medium text-text">
                  {revisedFile ? revisedFile.name : "Choose revised file"}
                </span>
                <span className="text-[10px] text-muted mt-1">PDF or DOCX up to 50MB</span>
              </label>
            </div>
          </div>

          {uploadingState.uploading && (
            <div className="p-4 rounded-xl border border-[#3b82f6]/40 bg-[#3b82f6]/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-[#3b82f6]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{uploadingState.stage}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/compare")}
              className="text-xs"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!baseFile || !revisedFile || isSubmitting}
              className="text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white gap-2 shadow-sm font-medium h-9 px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading & Processing...
                </>
              ) : (
                <>
                  <GitCompare className="h-3.5 w-3.5" />
                  Upload & Compare
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

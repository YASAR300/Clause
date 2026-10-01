"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function UploadDropzone({ onUploaded }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const processFile = async (file) => {
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isDocx =
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx");

    if (!isPdf && !isDocx) {
      toast.error("Please upload a PDF or DOCX contract file.");
      return;
    }

    setUploading(true);
    setProgress(15);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(40);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(85);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Upload failed");
      }

      setProgress(100);
      toast.success(`"${file.name}" uploaded successfully!`);
      if (typeof onUploaded === "function") {
        onUploaded(data);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(error.message || "Failed to upload document");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 500);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !uploading && fileInputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 select-none ${
        isDragging
          ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
          : "border-border/80 bg-surface/50 hover:border-border-strong hover:bg-surface/80"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-elevated text-accent shadow-sm">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          ) : (
            <UploadCloud className="h-6 w-6 text-accent" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-text">
            {uploading ? "Uploading & extracting..." : "Click or drag contract here"}
          </p>
          <p className="text-xs text-muted">
            PDF or DOCX up to 150+ pages. Offsets verified cryptographically.
          </p>
        </div>

        {uploading && (
          <div className="w-full max-w-xs pt-2">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>
    </div>
  );
}

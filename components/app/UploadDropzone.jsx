"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  X,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProcessingStepper } from "./ProcessingStepper";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function UploadDropzone({ onUploaded, onSuccess }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);

  const notifyComplete = (doc) => {
    if (typeof onSuccess === "function") {
      onSuccess(doc);
    } else if (typeof onUploaded === "function") {
      onUploaded(doc);
    } else {
      router.refresh();
    }
  };

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
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (incomingFiles) => {
    for (const file of incomingFiles) {
      // 1. Extension check
      const ext = file.name.slice(((file.name.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
      if (ext !== "pdf" && ext !== "docx") {
        toast.error(`"${file.name}" isn't supported. Upload a PDF or DOCX file.`);
        continue;
      }

      // 2. Empty file check
      if (file.size === 0) {
        toast.error(`"${file.name}" is empty (0 bytes).`);
        continue;
      }

      // 3. Over limit check
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          `"${file.name}" exceeds the 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`
        );
        continue;
      }

      const fileItem = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        status: "UPLOADING",
        progress: 15,
        statusDetail: "Uploading directly to storage...",
        startTime: Date.now(),
        documentId: null,
      };

      setFiles((prev) => [...prev, fileItem]);
      startUpload(fileItem);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updateFileItem = (id, updates) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeFileItem = (id) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const startUpload = async (item) => {
    let docId = null;

    try {
      // Try direct-to-blob upload first
      let uploadSucceeded = false;
      let blobResult = null;

      try {
        const { upload } = await import("@vercel/blob/client");
        blobResult = await upload(item.name, item.file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded / progressEvent.total) * 35
            );
            updateFileItem(item.id, {
              progress: Math.max(10, percent),
              statusDetail: `Uploading to storage (${Math.round((progressEvent.loaded / progressEvent.total) * 100)}%)...`,
            });
          },
        });
        uploadSucceeded = !!blobResult?.url;
      } catch (directErr) {
        // Direct client blob might fail if local dummy token: fallback to server upload
        console.warn("Direct blob upload error, falling back to server ingestion:", directErr.message);
      }

      if (uploadSucceeded && blobResult) {
        // Complete via /api/upload/complete
        updateFileItem(item.id, {
          progress: 40,
          statusDetail: "Initializing document pipeline...",
        });

        const res = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            sizeBytes: item.size,
            blobUrl: blobResult.url,
            blobPathname: blobResult.pathname,
            mimeType: item.file.type,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "Failed to initialize document");
        }
        docId = data.document.id;
      } else {
        // Fallback: multipart upload via server endpoint
        const formData = new FormData();
        formData.append("file", item.file);

        updateFileItem(item.id, {
          progress: 35,
          statusDetail: "Uploading contract to server...",
        });

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "Upload failed");
        }
        docId = data.document.id;
      }

      updateFileItem(item.id, {
        documentId: docId,
        status: "EXTRACTING",
        progress: 45,
        statusDetail: "Reading pages and character offsets...",
      });

      // Poll status until terminal state
      await pollDocumentStatus(item.id, docId, item.name);
    } catch (err) {
      updateFileItem(item.id, {
        status: "FAILED",
        progress: 0,
        statusDetail: err.message || "Failed to upload document",
      });
      toast.error(err.message || "Upload failed");
    }
  };

  const pollDocumentStatus = async (itemId, documentId, filename) => {
    let attempts = 0;
    const maxAttempts = 180; // 3 minutes timeout

    const check = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/documents/${documentId}/status`);
        if (!res.ok) {
          if (attempts < maxAttempts) {
            setTimeout(check, 1000);
          }
          return;
        }

        const data = await res.json();
        updateFileItem(itemId, {
          status: data.status,
          progress: data.progress,
          statusDetail: data.statusDetail,
          emptyPages: data.emptyPages,
        });

        if (data.status === "READY") {
          toast.success(`"${filename}" is ready`);
          notifyComplete({ id: documentId, name: filename });
          // Auto remove card after 3 seconds
          setTimeout(() => removeFileItem(itemId), 3000);
        } else if (data.status === "NEEDS_OCR" || data.status === "FAILED") {
          notifyComplete({ id: documentId, name: filename });
        } else if (attempts < maxAttempts) {
          setTimeout(check, 1000);
        }
      } catch (pollErr) {
        if (attempts < maxAttempts) {
          setTimeout(check, 1500);
        }
      }
    };

    setTimeout(check, 800);
  };

  const handleRetryItem = async (item) => {
    if (!item.documentId) {
      startUpload(item);
      return;
    }

    try {
      updateFileItem(item.id, {
        status: "QUEUED",
        progress: 10,
        statusDetail: "Retrying processing...",
      });
      const res = await fetch(`/api/documents/${item.documentId}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to retry processing");
      }
      pollDocumentStatus(item.id, item.documentId, item.name);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 select-none ${
          isDragging
            ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
            : "border-border/80 bg-surface/50 hover:border-border-strong hover:bg-surface/80"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Upload contracts"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-elevated text-accent shadow-sm">
            <UploadCloud className="h-6 w-6 text-accent" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-text">
              Click or drag contracts here
            </p>
            <p className="text-xs text-muted max-w-sm">
              Supports PDF and DOCX up to 50MB. Pages extracted with offset-anchored citations.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Cards per File */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-lg border border-border bg-surface shadow-sm space-y-2.5 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded bg-surface border border-border flex items-center justify-center shrink-0 text-accent">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text truncate max-w-xs" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted font-mono">{formatBytes(item.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.status === "READY" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        notifyComplete({ id: item.documentId, name: item.name });
                        removeFileItem(item.id);
                      }}
                      className="h-6 px-2 text-[10px] text-verified hover:bg-verified/10"
                    >
                      Done
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFileItem(item.id)}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted hover:text-text hover:bg-surface-hover"
                    aria-label="Remove item"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Stepper with progress and time */}
              <ProcessingStepper
                status={item.status}
                progress={item.progress}
                statusDetail={item.statusDetail}
                startTime={item.startTime}
                emptyPages={item.emptyPages}
                onRetry={() => handleRetryItem(item)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  XCircle,
  FileSearch,
} from "lucide-react";

export function StatusBadge({
  status,
  progress,
  statusDetail = "",
  className = "",
}) {
  switch (status) {
    case "READY":
      return (
        <Badge
          variant="outline"
          className={`border-verified/30 bg-verified/10 text-verified text-[11px] font-mono gap-1 py-0.5 px-2 ${className}`}
          title="Ready for questions and offset-anchored citations"
        >
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </Badge>
      );
    case "EXTRACTING":
    case "INDEXING":
    case "UPLOADING":
    case "QUEUED":
      return (
        <Badge
          variant="outline"
          className={`border-accent/40 bg-accent/10 text-accent text-[11px] font-mono gap-1.5 py-0.5 px-2 ${className}`}
          title={statusDetail || `${status}...`}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>
            {status === "INDEXING"
              ? "Indexing"
              : status === "EXTRACTING"
              ? "Reading pages"
              : status === "QUEUED"
              ? "Queued"
              : "Uploading"}
          </span>
          {typeof progress === "number" && progress > 0 && (
            <span className="text-[10px] font-bold opacity-90">{progress}%</span>
          )}
        </Badge>
      );
    case "NEEDS_OCR":
      return (
        <Badge
          variant="outline"
          className={`border-unverified/40 bg-unverified/10 text-unverified text-[11px] font-mono gap-1 py-0.5 px-2 cursor-help ${className}`}
          title={statusDetail || "PDF has no selectable text. Please upload a searchable PDF or run OCR."}
        >
          <AlertTriangle className="h-3 w-3" />
          Needs OCR
        </Badge>
      );
    case "FAILED":
      return (
        <Badge
          variant="outline"
          className={`border-danger/40 bg-danger/10 text-danger text-[11px] font-mono gap-1 py-0.5 px-2 cursor-help ${className}`}
          title={statusDetail || "Extraction failed"}
        >
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`text-muted text-[11px] ${className}`}>
          {status}
        </Badge>
      );
  }
}

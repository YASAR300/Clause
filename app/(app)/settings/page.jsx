"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Cpu,
  Database,
  HardDrive,
  ShieldAlert,
  Server,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const fetcher = (url) => fetch(url).then((res) => res.json());

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function SettingsPage() {
  const { data, isLoading, mutate } = useSWR("/api/settings", fetcher);

  const [showWipeModal, setShowWipeModal] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isWiping, setIsWiping] = useState(false);

  const handleWipeData = async (e) => {
    e.preventDefault();
    if (confirmationInput !== "DELETE ALL DATA") {
      toast.error('You must type "DELETE ALL DATA" exactly');
      return;
    }

    try {
      setIsWiping(true);
      const res = await fetch("/api/settings/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmationInput }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || "Failed to wipe workspace data");
      }

      toast.success("Workspace wiped. All contracts and conversations cleared.");
      setShowWipeModal(false);
      setConfirmationInput("");
      mutate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-20">
      <PageHeader
        breadcrumbs={[{ label: "Clause", href: "/dashboard" }, { label: "Settings" }]}
        title="Settings & Workspace"
        description="Verify AI runtime configuration, storage utilization, and database status."
      />

      {/* AI Provider Config */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-surface border border-border flex items-center justify-center text-accent">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-text">AI Inference Provider</h2>
              <p className="text-[11px] text-muted">
                Active OpenAI-compatible inference endpoint for retrieval & synthesis.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-verified/40 bg-verified/10 text-verified font-mono text-[11px] gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            Online
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-md bg-bg/50 border border-border/60">
            <span className="text-muted block text-[11px] mb-1">Provider Host</span>
            <span className="font-mono text-text font-medium">
              {isLoading ? "Loading..." : data?.ai?.providerHost || "api.groq.com"}
            </span>
          </div>

          <div className="p-3 rounded-md bg-bg/50 border border-border/60">
            <span className="text-muted block text-[11px] mb-1">Model Architecture</span>
            <span className="font-mono text-text font-medium truncate block">
              {isLoading ? "Loading..." : data?.ai?.model || "llama-3.3-70b-versatile"}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-bg/40 border border-border/40 text-[11px] text-muted flex items-center gap-2">
          <Server className="h-3.5 w-3.5 text-accent shrink-0" />
          <span>
            API keys are strictly bound in server environment secrets and never transmitted or rendered client-side.
          </span>
        </div>
      </div>

      {/* Storage and Database Breakdown */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-surface border border-border flex items-center justify-center text-accent">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-text">Storage & Database Utilization</h2>
              <p className="text-[11px] text-muted">
                Live counts computed across PostgreSQL tables and document blobs.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-text font-semibold">
            {isLoading ? "—" : formatBytes(data?.storage?.totalBytes)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-md bg-bg/50 border border-border/60">
            <span className="text-muted block text-[11px]">Indexed Contracts</span>
            <span className="font-mono text-lg font-bold text-text mt-1 block">
              {isLoading ? "—" : data?.storage?.documentCount || 0}
            </span>
          </div>

          <div className="p-3 rounded-md bg-bg/50 border border-border/60">
            <span className="text-muted block text-[11px]">Q&A Conversations</span>
            <span className="font-mono text-lg font-bold text-text mt-1 block">
              {isLoading ? "—" : data?.storage?.conversationCount || 0}
            </span>
          </div>

          <div className="p-3 rounded-md bg-bg/50 border border-border/60">
            <span className="text-muted block text-[11px]">Ground Citations</span>
            <span className="font-mono text-lg font-bold text-text mt-1 block text-verified">
              {isLoading ? "—" : data?.storage?.citationCount || 0}
            </span>
          </div>

          <div className="p-3 rounded-md bg-bg/50 border border-border/60">
            <span className="text-muted block text-[11px]">Version Comparisons</span>
            <span className="font-mono text-lg font-bold text-text mt-1 block">
              {isLoading ? "—" : data?.storage?.comparisonCount || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-danger/20">
          <div className="h-8 w-8 rounded-lg bg-danger/10 border border-danger/30 flex items-center justify-center text-danger">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-danger">Danger Zone</h2>
            <p className="text-[11px] text-muted">
              Irreversible destructive actions on this single-user workspace.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-medium text-text">Wipe all workspace data</h3>
            <p className="text-[11px] text-muted max-w-md">
              Permanently purges all contracts, extracted chunks, full-text search indexes, Q&A message logs, citations, and cloud storage blobs.
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowWipeModal(true)}
            className="text-xs gap-1.5 shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete All Data
          </Button>
        </div>
      </div>

      {/* Typed Confirmation Wipe Modal */}
      <Dialog open={showWipeModal} onOpenChange={setShowWipeModal}>
        <DialogContent className="sm:max-w-md bg-surface border-border p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-danger mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-semibold text-text">
                Confirm Total Workspace Wipe
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted leading-relaxed">
              This action cannot be undone. All indexed documents, conversations, verified citation mappings, and storage files will be erased immediately.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWipeData} className="space-y-4 mt-2">
            <div>
              <p className="text-xs text-text mb-2">
                To confirm, type <span className="font-mono font-bold text-danger select-all">DELETE ALL DATA</span> in the field below:
              </p>
              <Input
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="DELETE ALL DATA"
                className="font-mono text-xs bg-bg/50 border-danger/40 focus:border-danger"
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowWipeModal(false);
                  setConfirmationInput("");
                }}
                disabled={isWiping}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={confirmationInput !== "DELETE ALL DATA" || isWiping}
                className="text-xs gap-1.5"
              >
                {isWiping && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Permanently Wipe Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

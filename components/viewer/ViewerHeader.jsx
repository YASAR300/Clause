"use client";

import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Download,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Layers,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Top header bar for the Document Viewer layout.
 * Features document switching, search-in-doc with match cycling,
 * status badge, original file download, and chat drawer toggle.
 */
export function ViewerHeader({
  document,
  allDocuments = [],
  onSelectDocument,
  searchQuery = "",
  onSearchChange,
  matchIndex = 0,
  totalMatches = 0,
  onNextMatch,
  onPrevMatch,
  chatOpen = true,
  onToggleChat,
}) {
  if (!document) return null;

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#222226] bg-[#0c0c0e]/95 backdrop-blur-md shrink-0 z-30">
      {/* Left: Back & Document Details / Switcher */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Link
          href="/documents"
          className="p-1.5 rounded-lg text-[#71717a] hover:text-[#ededed] hover:bg-[#18181b] transition-colors shrink-0"
          aria-label="Back to document library"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {allDocuments.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 min-w-0 max-w-[280px] p-1 rounded-md hover:bg-[#18181b] transition-colors text-left"
              >
                <FileText className="h-4 w-4 text-[#3b82f6] shrink-0" />
                <span className="font-semibold text-xs text-[#ededed] truncate">
                  {document.name}
                </span>
                <span className="text-[10px] font-mono text-[#71717a] shrink-0">▼</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-[#121215] border-[#27272a]">
              {allDocuments.map((doc) => (
                <DropdownMenuItem
                  key={doc.id}
                  onClick={() => onSelectDocument?.(doc.id)}
                  className={`gap-2 text-xs cursor-pointer ${
                    doc.id === document.id ? "text-[#3b82f6] bg-[#3b82f6]/10" : "text-[#ededed]"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{doc.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 min-w-0 max-w-md">
            <FileText className="h-4 w-4 text-[#3b82f6] shrink-0" />
            <h1 className="font-semibold text-xs sm:text-sm text-[#ededed] truncate">
              {document.name}
            </h1>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <StatusBadge status={document.status} />
          {document.pageCount && (
            <span className="font-mono text-[10px] text-[#71717a] bg-[#18181b] border border-[#27272a] px-1.5 py-0.5 rounded">
              {document.pageCount} {document.pageCount === 1 ? "page" : "pages"}
            </span>
          )}
        </div>
      </div>

      {/* Center: Find-in-document box */}
      <div className="flex items-center gap-1 bg-[#141418] border border-[#27272a] focus-within:border-[#3b82f6]/60 rounded-lg px-2 py-1 max-w-[240px] sm:max-w-[280px] w-full">
        <Search className="h-3.5 w-3.5 text-[#71717a] shrink-0 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Find in document..."
          className="w-full bg-transparent text-xs text-[#ededed] placeholder:text-[#71717a] focus:outline-none"
        />

        {searchQuery && (
          <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-[#71717a]">
            {totalMatches > 0 ? (
              <span>
                {matchIndex + 1}/{totalMatches}
              </span>
            ) : (
              <span>0/0</span>
            )}

            <button
              type="button"
              onClick={onPrevMatch}
              disabled={totalMatches <= 1}
              className="p-0.5 hover:text-[#ededed] disabled:opacity-30"
              aria-label="Previous search match"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onNextMatch}
              disabled={totalMatches <= 1}
              className="p-0.5 hover:text-[#ededed] disabled:opacity-30"
              aria-label="Next search match"
            >
              <ChevronDown className="h-3 w-3" />
            </button>

            <button
              type="button"
              onClick={() => onSearchChange?.("")}
              className="p-0.5 hover:text-[#ededed]"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Download original & Toggle Chat Panel */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-7 px-2 text-xs border-[#27272a] text-[#a1a1aa] hover:text-[#ededed] hover:bg-[#18181b] gap-1"
        >
          <a
            href={`/api/documents/${document.id}/file`}
            download={document.name}
            title="Download original file"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Download</span>
          </a>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onToggleChat}
          className={`h-7 px-2 text-xs border-[#27272a] gap-1 transition-colors ${
            chatOpen
              ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30"
              : "text-[#a1a1aa] hover:text-[#ededed] hover:bg-[#18181b]"
          }`}
          title={chatOpen ? "Hide chat panel" : "Show chat panel"}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{chatOpen ? "Chat" : "Open Chat"}</span>
        </Button>
      </div>
    </header>
  );
}

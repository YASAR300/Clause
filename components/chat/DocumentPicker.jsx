"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  FileText,
  Plus,
  X,
  Search,
  Check,
  ChevronDown,
  Loader2,
  FolderOpen,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const fetcher = (url) => fetch(url).then((res) => res.json());

/**
 * Multi-select Document Picker Combobox with live search and chips.
 * Used inside ChatComposer to select and toggle documents for multi-document Q&A.
 */
export function DocumentPicker({
  selectedDocs = [],
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useSWR(
    open ? "/api/documents?status=READY&limit=50" : null,
    fetcher
  );

  const availableDocs = data?.items || [];

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return availableDocs;
    const lower = search.toLowerCase();
    return availableDocs.filter((d) => d.name?.toLowerCase().includes(lower));
  }, [availableDocs, search]);

  const selectedIds = useMemo(() => {
    return new Set(selectedDocs.map((d) => d.id));
  }, [selectedDocs]);

  const handleToggleDoc = (doc) => {
    if (!onChange) return;
    if (selectedIds.has(doc.id)) {
      if (selectedDocs.length <= 1) return; // Keep at least one document
      const next = selectedDocs.filter((d) => d.id !== doc.id);
      // Re-assign D1, D2, ... labels
      const relabeled = next.map((d, i) => ({ ...d, label: `D${i + 1}` }));
      onChange(relabeled);
    } else {
      const next = [
        ...selectedDocs,
        { id: doc.id, name: doc.name, pageCount: doc.pageCount },
      ];
      const relabeled = next.map((d, i) => ({ ...d, label: `D${i + 1}` }));
      onChange(relabeled);
    }
  };

  const handleRemoveDoc = (id, e) => {
    e?.stopPropagation();
    if (!onChange || selectedDocs.length <= 1) return;
    const next = selectedDocs.filter((d) => d.id !== id);
    const relabeled = next.map((d, i) => ({ ...d, label: `D${i + 1}` }));
    onChange(relabeled);
  };

  return (
    <div className="flex items-center gap-1.5 flex-nowrap">
      {/* Active Selected Document Chips */}
      {selectedDocs.map((doc, idx) => {
        const label = doc.label || `D${idx + 1}`;
        const canRemove = selectedDocs.length > 1;

        return (
          <span
            key={doc.id || idx}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-[#ededed] shadow-xs group shrink-0"
          >
            <span className="font-mono text-[10px] font-semibold text-[#3b82f6]">
              [{label}]
            </span>
            <span className="truncate max-w-[95px] sm:max-w-[140px] text-[11px]" title={doc.name}>
              {doc.name}
            </span>
            {canRemove && !disabled && (
              <button
                type="button"
                onClick={(e) => handleRemoveDoc(doc.id, e)}
                className="text-[#71717a] hover:text-[#ef4444] transition-colors p-0.5 rounded"
                aria-label={`Remove ${doc.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        );
      })}

      {/* Combobox Dropdown Trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-6 px-2 text-[11px] font-medium border-[#27272a] text-[#71717a] hover:text-[#ededed] hover:bg-[#18181b] gap-1 rounded-md"
          >
            <Plus className="h-3 w-3 text-[#3b82f6]" />
            <span className="hidden sm:inline">Add Contract</span>
            <span className="sm:hidden">Add</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="top"
          className="w-72 p-2 bg-[#121215] border border-[#27272a] shadow-2xl rounded-lg text-xs z-50 space-y-2"
        >
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#71717a]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contracts..."
              className="w-full h-7 pl-8 pr-2 bg-[#18181b] border border-[#27272a] rounded-md text-xs text-[#ededed] placeholder:text-[#71717a] focus:outline-none focus:border-[#3b82f6]"
              autoFocus
            />
          </div>

          {/* Document list */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {isLoading ? (
              <div className="py-4 text-center text-[#71717a] flex items-center justify-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3b82f6]" />
                <span>Loading contracts...</span>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="py-4 text-center text-[#71717a]">
                No matching contracts found
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = selectedIds.has(doc.id);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleToggleDoc(doc)}
                    className={`w-full flex items-center justify-between gap-2 p-1.5 rounded-md text-left transition-colors ${
                      isSelected
                        ? "bg-[#3b82f6]/10 text-[#ededed] border border-[#3b82f6]/30"
                        : "hover:bg-[#18181b] text-[#a1a1aa] hover:text-[#ededed]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-3.5 w-3.5 text-[#71717a] shrink-0" />
                      <span className="truncate text-[11px] font-medium" title={doc.name}>
                        {doc.name}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-[#3b82f6] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

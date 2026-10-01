"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  FileText,
  MessageSquare,
  GitCompare,
  Upload,
  LayoutDashboard,
  Settings,
  Search,
  ArrowRight,
  Loader2,
} from "lucide-react";

export function CommandPalette({ open, setOpen }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ documents: [], conversations: [] });
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ documents: [], conversations: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (e) {
        // Ignore fetch errors in command palette
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (action) => {
      setOpen(false);
      action();
    },
    [setOpen]
  );

  // Keyboard shortcut listener (Cmd+K, /, G+D, G+L, U)
  useEffect(() => {
    let lastKey = null;
    let keyTimeout = null;

    const onKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable);

      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // If already open, let Cmdk handle arrows/enter
      if (open) return;

      // "/" opens search if not typing
      if (!isInput && e.key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // "u" triggers upload if not typing
      if (!isInput && e.key.toLowerCase() === "u") {
        e.preventDefault();
        router.push("/documents?upload=1");
        return;
      }

      // "g" sequence detection
      if (!isInput) {
        if (lastKey === "g") {
          clearTimeout(keyTimeout);
          lastKey = null;
          if (e.key.toLowerCase() === "d") {
            e.preventDefault();
            router.push("/dashboard");
          } else if (e.key.toLowerCase() === "l") {
            e.preventDefault();
            router.push("/documents");
          }
          return;
        }

        if (e.key.toLowerCase() === "g") {
          lastKey = "g";
          keyTimeout = setTimeout(() => {
            lastKey = null;
          }, 1000);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (keyTimeout) clearTimeout(keyTimeout);
    };
  }, [open, setOpen, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="flex flex-col h-full w-full">
          <div className="flex items-center px-3.5 border-b border-border bg-elevated/50">
            <Search className="h-4 w-4 text-muted shrink-0 mr-2.5" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search contracts, conversations, or actions..."
              className="w-full bg-transparent py-3.5 text-xs text-text placeholder:text-muted focus:outline-none"
            />
            {loading && <Loader2 className="h-3.5 w-3.5 text-muted animate-spin shrink-0" />}
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 text-xs space-y-1">
            <Command.Empty className="py-6 text-center text-xs text-muted">
              No results found.
            </Command.Empty>

            {/* Matching Documents */}
            {results.documents.length > 0 && (
              <Command.Group heading="Contracts" className="text-[11px] font-mono uppercase tracking-wider text-muted/70 px-2 py-1">
                {results.documents.map((doc) => (
                  <Command.Item
                    key={doc.id}
                    onSelect={() =>
                      handleSelect(() => router.push(`/documents?highlight=${doc.id}`))
                    }
                    className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-text hover:bg-elevated transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                    {doc.pageCount && (
                      <span className="text-[10px] font-mono text-muted shrink-0">
                        {doc.pageCount} pages
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Matching Conversations */}
            {results.conversations.length > 0 && (
              <Command.Group heading="Chats" className="text-[11px] font-mono uppercase tracking-wider text-muted/70 px-2 py-1">
                {results.conversations.map((chat) => (
                  <Command.Item
                    key={chat.id}
                    onSelect={() =>
                      handleSelect(() => router.push(`/chats/${chat.id}`))
                    }
                    className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-text hover:bg-elevated transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="h-3.5 w-3.5 text-verified shrink-0" />
                      <span className="truncate">{chat.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted shrink-0">
                      {chat.mode}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Navigation Actions */}
            <Command.Group heading="Navigation" className="text-[11px] font-mono uppercase tracking-wider text-muted/70 px-2 py-1">
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/dashboard"))}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-text hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-3.5 w-3.5 text-muted" />
                  <span>Go to Dashboard</span>
                </div>
                <kbd className="font-mono text-[10px] text-muted">G then D</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => router.push("/documents"))}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-text hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted" />
                  <span>Go to Document Library</span>
                </div>
                <kbd className="font-mono text-[10px] text-muted">G then L</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => router.push("/chats"))}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-text hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted" />
                  <span>Go to Chats</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => router.push("/compare"))}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-text hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GitCompare className="h-3.5 w-3.5 text-muted" />
                  <span>Go to Version Compare</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => router.push("/settings"))}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-text hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5 text-muted" />
                  <span>Go to Settings</span>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group heading="Actions" className="text-[11px] font-mono uppercase tracking-wider text-muted/70 px-2 py-1">
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/documents?upload=1"))}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-text hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-3.5 w-3.5 text-accent" />
                  <span>Upload Document</span>
                </div>
                <kbd className="font-mono text-[10px] text-muted">U</kbd>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-elevated/40 text-[10px] text-muted font-mono">
            <span>Press ↑↓ to navigate, ↵ to select</span>
            <span>ESC to close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

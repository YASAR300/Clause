"use client";

import { Menu, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({ onOpenMobileMenu, onOpenSearch }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface/60 px-4 sm:px-6 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileMenu}
          className="md:hidden h-8 w-8 text-muted hover:text-text"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 text-xs font-mono text-muted">
          <span className="h-2 w-2 rounded-full bg-verified inline-block" />
          <span className="hidden sm:inline">Clause Engine // Verifiable Citations</span>
          <span className="sm:hidden">Clause</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-elevated/70 px-2.5 py-1 text-xs text-muted hover:text-text transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Quick actions</span>
          <kbd className="font-mono text-[10px] bg-surface px-1 py-0.2 rounded border border-border text-muted/80">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
}

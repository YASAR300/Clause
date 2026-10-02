"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  GitCompare,
  Settings,
  Search,
  Upload,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

const fetcher = (url) => fetch(url).then((res) => res.json());

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Chats", href: "/chats", icon: MessageSquare },
  { label: "Compare", href: "/compare", icon: GitCompare },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ onOpenSearch }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Read collapsed state from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("clause_sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("clause_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Recent 5 documents
  const { data } = useSWR("/api/documents?limit=5", fetcher, {
    revalidateOnFocus: false,
  });
  const recentDocs = data?.items || [];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between border-r border-border bg-surface/95 transition-all duration-300 ease-in-out select-none shrink-0 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Top Brand & Workspace */}
      <div>
        <div className="flex h-14 items-center justify-between px-3.5 border-b border-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <LogoMark className="h-6 w-6 shrink-0" />
            {!collapsed && (
              <div className="truncate">
                <span className="text-sm font-semibold tracking-tight text-text block leading-none">
                  Clause
                </span>
                <span className="text-[10px] font-mono text-muted tracking-tight">
                  Legal Workspace
                </span>
              </div>
            )}
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-7 w-7 text-muted hover:text-text rounded-md"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search Command Trigger */}
        <div className="p-3">
          <button
            onClick={onOpenSearch}
            className={`w-full flex items-center gap-2 rounded-lg border border-border bg-elevated/70 px-2.5 py-1.5 text-xs text-muted hover:text-text hover:border-border-strong transition-colors ${
              collapsed ? "justify-center" : "justify-between"
            }`}
            title="Search (Cmd/Ctrl + K)"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span className="truncate">Search...</span>}
            </div>
            {!collapsed && (
              <kbd className="hidden sm:inline-block font-mono text-[10px] bg-surface px-1.5 py-0.2 rounded border border-border text-muted">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Main Navigation Links */}
        <nav aria-label="Sidebar Navigation" className="px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent border border-accent/20"
                    : "text-muted hover:text-text hover:bg-elevated/60"
                } ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Recent Documents List */}
        {!collapsed && (
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-muted/70 px-2 mb-2">
              <span>Recent Contracts</span>
              <Clock className="h-3 w-3" />
            </div>

            {recentDocs.length === 0 ? (
              <p className="text-[11px] text-muted/60 px-2 italic">
                No contracts yet
              </p>
            ) : (
              <div className="space-y-0.5">
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents?highlight=${doc.id}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-elevated/50 transition-colors truncate"
                    title={doc.name}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <span className="truncate">{doc.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Upload & Verification Pill */}
      <div className="p-3 border-t border-border space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono text-muted/80">
            <ShieldCheck className="h-3.5 w-3.5 text-verified" />
            <span>Verification Engine Online</span>
          </div>
        )}

        <Link href="/documents?upload=1" className="block">
          <Button
            size="sm"
            className={`w-full bg-accent hover:bg-accent/90 text-white gap-2 text-xs h-9 ${
              collapsed ? "px-0 justify-center" : ""
            }`}
            title="Upload Contract"
          >
            <Upload className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Upload Contract</span>}
          </Button>
        </Link>
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onOpenChange, onOpenSearch }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col justify-between h-full bg-surface p-4 pb-8 sm:pb-4">
      <div>
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-border">
          <LogoMark className="h-6 w-6" />
          <span className="text-sm font-semibold text-text">Clause Workspace</span>
        </div>

        <button
          onClick={() => {
            onOpenChange(false);
            onOpenSearch();
          }}
          className="w-full flex items-center justify-between rounded-lg border border-border bg-elevated px-3 py-2.5 text-xs text-muted mb-4 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>Search...</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border">
            ⌘K
          </kbd>
        </button>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent border border-accent/20"
                    : "text-muted hover:text-text hover:bg-elevated"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-border">
        <Link
          href="/documents?upload=1"
          onClick={() => onOpenChange(false)}
          className="block"
        >
          <Button className="w-full bg-accent text-white gap-2 text-xs h-10 shadow-sm active:scale-[0.99] transition-transform">
            <Upload className="h-4 w-4" />
            Upload Contract
          </Button>
        </Link>
      </div>
    </div>
  );
}

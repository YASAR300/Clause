"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, MobileSidebar } from "@/components/app/Sidebar";
import { TopBar } from "@/components/app/TopBar";
import { CommandPalette } from "@/components/app/CommandPalette";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const isFullBleed =
    (pathname?.startsWith("/chats/") && pathname !== "/chats") ||
    (pathname?.startsWith("/documents/") && pathname !== "/documents");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-text">
      {/* Desktop Sidebar */}
      <Sidebar onOpenSearch={() => setCommandPaletteOpen(true)} />

      {/* Mobile Drawer Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-72 border-r border-border bg-surface">
          <MobileSidebar
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            onOpenSearch={() => setCommandPaletteOpen(true)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* On mobile full-bleed views like /chats/[id], the view provides its own purpose-built header. Hide TopBar on mobile to prevent double-stacked headers. */}
        <div className={isFullBleed ? "hidden md:block" : "block"}>
          <TopBar
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onOpenSearch={() => setCommandPaletteOpen(true)}
          />
        </div>

        {isFullBleed ? (
          <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        )}
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        setOpen={setCommandPaletteOpen}
      />
    </div>
  );
}

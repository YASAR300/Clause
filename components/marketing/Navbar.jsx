"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ArrowRight } from "lucide-react";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Compare", href: "#compare" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav
        aria-label="Main Navigation"
        className={`pointer-events-auto flex items-center justify-between transition-all duration-300 ease-out border border-border backdrop-blur-xl ${
          scrolled
            ? "w-full max-w-3xl py-2 px-4 rounded-full bg-surface/85 shadow-2xl shadow-black/50 border-border-strong scale-[0.98]"
            : "w-full max-w-4xl py-2.5 px-5 rounded-full bg-surface/60 shadow-lg shadow-black/20"
        }`}
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <Logo />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1 text-sm font-medium text-muted">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-full text-xs text-muted hover:text-text hover:bg-elevated/80 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="#contact"
            className="px-3 py-1.5 text-xs font-medium text-muted hover:text-text transition-colors"
          >
            Contact
          </a>
          <Link href="/dashboard">
            <Button
              size="sm"
              className="h-8 rounded-full px-3.5 text-xs font-medium bg-accent hover:bg-accent/90 text-white shadow-sm gap-1.5"
            >
              Open Clause
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Trigger */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/dashboard">
            <Button size="sm" className="h-7 text-xs rounded-full px-2.5 bg-accent">
              Open
            </Button>
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted hover:text-text"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 bg-surface/95 backdrop-blur-xl border-border p-6 flex flex-col justify-between"
            >
              <div className="flex flex-col gap-6">
                <Logo />
                <div className="flex flex-col gap-2 mt-4">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="px-3 py-2 rounded-md text-sm text-muted hover:text-text hover:bg-elevated transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                  <a
                    href="#contact"
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 rounded-md text-sm text-muted hover:text-text hover:bg-elevated transition-colors"
                  >
                    Contact
                  </a>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-accent text-white gap-2">
                    Open Clause
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

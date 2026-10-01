import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="bg-bg border-t border-border/80 pt-16 pb-12 text-xs text-muted">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-border/60">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <Logo />
            <p className="text-xs text-muted max-w-xs leading-relaxed">
              Contract answers you can verify, word for word. Every citation tested against
              exact document character coordinates.
            </p>
            <div className="pt-2 text-[11px] font-mono text-muted/60">
              Deterministic verification architecture.
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <div className="font-semibold text-text mb-3">Product</div>
            <ul className="space-y-2">
              <li>
                <a href="#product" className="hover:text-text transition-colors">
                  Overview
                </a>
              </li>
              <li>
                <a href="#demo" className="hover:text-text transition-colors">
                  Verification Demo
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-text transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#compare" className="hover:text-text transition-colors">
                  Version Comparison
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-text mb-3">Resources</div>
            <ul className="space-y-2">
              <li>
                <a href="#how-it-works" className="hover:text-text transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-text transition-colors">
                  Pricing & Waitlist
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-text transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-text transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-text mb-3">Application</div>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-accent hover:underline">
                  Open Workspace
                </Link>
              </li>
              <li>
                <Link href="/documents" className="hover:text-text transition-colors">
                  Upload Contract
                </Link>
              </li>
              <li>
                <a href="/api/health" target="_blank" className="hover:text-text transition-colors font-mono text-[11px]">
                  System Status
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-muted/70">
          <p>
            © {new Date().getFullYear()} Clause Inc. Built for legal accuracy.
          </p>

          <p className="max-w-xl text-center md:text-right leading-normal text-muted/60">
            Disclaimer: Clause is an automated contract intelligence tool and does not provide
            legal advice. Always consult a qualified attorney for legal determinations.
          </p>
        </div>
      </div>
    </footer>
  );
}

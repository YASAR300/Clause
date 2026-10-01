"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Bot,
  User,
  Sparkles,
  Maximize2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const FULL_STREAMING_TEXT =
  "Under Section 8.1, aggregate liability is strictly capped at the total amounts paid or payable in the preceding 12 months [1]. Crucially, claims arising from gross negligence or willful misconduct are carved out and remain uncapped [2].";

export function HeroMockup() {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [activeCitation, setActiveCitation] = useState(1);

  // Typing/Streaming Animation Loop
  useEffect(() => {
    let timeout;
    if (displayedLength < FULL_STREAMING_TEXT.length) {
      timeout = setTimeout(() => {
        setDisplayedLength((prev) => prev + 1);
      }, 24);
    } else {
      setIsTypingComplete(true);
      timeout = setTimeout(() => {
        setDisplayedLength(0);
        setIsTypingComplete(false);
      }, 6000);
    }
    return () => clearTimeout(timeout);
  }, [displayedLength]);

  const currentText = FULL_STREAMING_TEXT.slice(0, displayedLength);

  return (
    <section id="product" className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-4 pb-20">
      {/* Halo Arc Behind Mockup */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-[350px] w-[800px] rounded-[100%] bg-accent/20 blur-[90px] opacity-70"
      />

      {/* 3D Perspective Card Container */}
      <div className="relative mx-auto [perspective:1400px]">
        <div className="relative rounded-2xl border border-border/80 bg-surface/90 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.9),0_0_40px_-10px_rgba(94,106,210,0.3)] backdrop-blur-xl overflow-hidden transition-transform duration-700 hover:[transform:rotateX(1deg)]">
          {/* macOS Traffic-Light Window Chrome */}
          <div className="flex h-11 items-center justify-between border-b border-border/80 bg-elevated/70 px-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#eb5757]/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-[#f2994a]/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-[#4cb782]/80 inline-block" />
              <span className="ml-3 text-[11px] font-mono text-muted/80 hidden sm:inline-block">
                clause-app // master-services-agreement-v2.pdf
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-surface/60 px-2 py-0.5 text-[11px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-verified animate-ping" />
                <span>Verification Engine Active</span>
              </div>
            </div>
          </div>

          {/* Split Pane: Left Document Viewer / Right Chat Pane */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
            {/* Left Pane: Document Text (7 cols) */}
            <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-border/70 p-6 font-sans text-xs leading-relaxed text-muted bg-[#0a0b0d]/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/50 text-[11px] text-muted">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-accent" />
                    <span className="font-semibold text-text">
                      MSA_Vendor_Enterprise_2026.pdf
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-muted">Page 12 of 42</span>
                </div>

                <div className="space-y-3 select-none">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted/60 font-semibold">
                    8. LIMITATION OF LIABILITY & CARVEOUTS
                  </div>

                  <p className="text-muted/80">
                    8.1 Aggregate Liability. Except with respect to damages caused by gross
                    negligence, fraud, or intentional misconduct, and indemnification
                    obligations under Section 9:
                  </p>

                  {/* Highlighted Verified Clause */}
                  <div
                    className={`relative p-3 rounded-md border transition-all duration-300 font-mono text-[11px] ${
                      activeCitation === 1
                        ? "border-accent bg-accent/15 text-white shadow-[0_0_20px_rgba(94,106,210,0.25)]"
                        : "border-border/60 bg-surface/40 text-text"
                    }`}
                  >
                    <div className="absolute -top-2.5 right-3 px-1.5 py-0.2 rounded bg-accent text-[9px] font-semibold text-white uppercase tracking-wider">
                      Verified Citation [1]
                    </div>
                    &quot;neither party&apos;s total aggregate liability arising out of or related to
                    this Agreement shall exceed the total amounts paid or payable by Customer under the
                    applicable Order Form in the twelve (12) months preceding the incident.&quot;
                  </div>

                  <p className="text-muted/80">
                    8.2 Unlimited Claims. Notwithstanding anything to the contrary in Section
                    8.1, the liability limitations in this Agreement shall not apply to breaches of
                    Section 7 (Confidentiality) or liabilities arising from gross negligence.
                  </p>
                </div>
              </div>

              {/* Document Offset Footer */}
              <div className="mt-6 pt-3 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted/60">
                <span>Offset: 48,210 – 48,460</span>
                <span className="text-verified flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 100% Exact Document Match
                </span>
              </div>
            </div>

            {/* Right Pane: Chat & Streaming Verification (5 cols) */}
            <div className="lg:col-span-5 p-6 bg-surface/40 flex flex-col justify-between">
              <div className="space-y-4">
                {/* User Prompt */}
                <div className="flex items-start gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-elevated text-text">
                    <User className="h-3 w-3" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm border border-border bg-surface p-3 text-xs text-text shadow-sm">
                    What is the aggregate liability cap, and does it cover gross negligence?
                  </div>
                </div>

                {/* Assistant Streaming Response */}
                <div className="flex items-start gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 border border-accent/40 text-accent">
                    <Bot className="h-3.5 w-3.5" />
                  </div>

                  <div className="flex-1 space-y-3 rounded-xl rounded-tl-sm border border-border/80 bg-elevated/70 p-3.5 text-xs text-text shadow-sm">
                    <p className="leading-relaxed">
                      {currentText}
                      {!isTypingComplete && (
                        <span className="inline-block h-3.5 w-1.5 ml-1 bg-accent animate-pulse align-middle" />
                      )}
                    </p>

                    {/* Verified Citation Pill Card */}
                    <div className="pt-2 border-t border-border/60">
                      <div
                        onMouseEnter={() => setActiveCitation(1)}
                        className="cursor-pointer flex items-center justify-between rounded-lg border border-verified/30 bg-verified/10 p-2.5 transition-colors hover:bg-verified/15"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-verified text-black text-[10px] font-bold">
                            1
                          </span>
                          <div>
                            <div className="text-[11px] font-medium text-text">
                              Section 8.1 — 12 Months Spend Cap
                            </div>
                            <div className="text-[10px] text-muted">
                              Exact match found in document text
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="border-verified/40 bg-verified/20 text-verified text-[10px] gap-1 px-1.5 py-0.5 font-mono"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Verified • p.12
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Chat Bar Mockup */}
              <div className="mt-4 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted/60">
                  <span>Ask a followup question...</span>
                  <span className="font-mono text-[10px] bg-elevated px-1.5 py-0.5 rounded border border-border">
                    Enter ↵
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Fade Gradient into Background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-bg via-bg/40 to-transparent"
          />
        </div>
      </div>
    </section>
  );
}

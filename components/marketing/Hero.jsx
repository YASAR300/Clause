"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden text-center flex flex-col items-center">
      {/* Background Masked Grid & Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        {/* Soft Indigo Glow */}
        <div className="absolute top-1/4 h-[500px] w-[700px] rounded-full bg-accent/15 blur-[120px] -translate-y-1/2 pointer-events-none" />

        {/* Masked Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 65% 50% at 50% 35%, black 40%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        {/* Verification Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-1 text-xs text-muted backdrop-blur-md shadow-sm mb-8 transition-colors hover:border-border-strong">
          <span className="flex h-1.5 w-1.5 rounded-full bg-verified animate-pulse" />
          <span className="text-text font-medium">Every quote verified</span>
          <span className="text-muted/60">•</span>
          <span>Zero hallucinated clauses</span>
        </div>

        {/* Two-Tone Headline with Gradient Text & Subtle Underline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-semibold tracking-[-0.035em] text-balance leading-[1.08] mb-6 max-w-5xl">
          <span className="bg-gradient-to-b from-white via-white/95 to-white/60 bg-clip-text text-transparent">
            Contract answers you can check,{" "}
          </span>
          <span className="relative inline-block text-white">
            word for word.
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-gradient-to-r from-accent via-accent to-verified opacity-85"
            />
          </span>
        </h1>

        {/* Subcopy */}
        <p className="max-w-3xl text-base sm:text-lg text-muted font-normal leading-relaxed text-balance mb-8">
          Ask questions about any contract, and get answers backed by exact quotes
          that are confirmed in the source text before you see them.
        </p>

        {/* Two CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-6">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="h-11 px-6 rounded-full bg-white text-bg hover:bg-white/90 font-medium text-sm shadow-lg shadow-white/5 transition-transform active:scale-[0.98] gap-2"
            >
              Start analysing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <a href="#demo">
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-6 rounded-full border-border bg-surface/70 hover:bg-elevated text-text text-sm font-medium transition-colors"
            >
              See how verification works
            </Button>
          </a>
        </div>

        {/* Understated capability disclaimer */}
        <p className="text-[12px] text-muted tracking-tight flex items-center justify-center gap-2">
          <span>PDF and DOCX</span>
          <span className="text-border-strong">•</span>
          <span>Up to 150+ pages</span>
          <span className="text-border-strong">•</span>
          <span>No account needed</span>
        </p>
      </div>
    </section>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Search,
  ShieldCheck,
  Binary,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SCENARIOS = [
  {
    id: "verified",
    title: "Scenario A: Genuine Clause",
    subtitle: "Real clause present in Section 14.2",
    quote:
      "Either party may terminate this Agreement for convenience upon sixty (60) days prior written notice to the other party.",
    matched: true,
    page: "Page 4, Line 18",
    offset: "14,290 – 14,412",
    verdict: "VERIFIED",
    verdictDetail:
      "Exact text match confirmed in Document.fullText after whitespace normalization. Citation approved for assistant synthesis.",
  },
  {
    id: "unverified",
    title: "Scenario B: Fabricated Hallucination",
    subtitle: "Plausible text invented by the model",
    quote:
      "Vendor shall at all times maintain comprehensive general liability insurance of not less than $25,000,000 per occurrence.",
    matched: false,
    page: "Not found in any page",
    offset: "No matches found (0 occurrences)",
    verdict: "UNVERIFIED",
    verdictDetail:
      "Exact match failed across all 42 pages. Clause automatically blocks this quote from being cited as document ground truth.",
  },
];

export function VerificationDemo() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  const scenario = SCENARIOS[scenarioIndex];

  // Auto-play timer through steps 1 -> 2 -> 3 -> switch scenario
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < 3) return prev + 1;
        // Move to next scenario after step 3
        setScenarioIndex((s) => (s === 0 ? 1 : 0));
        return 1;
      });
    }, 3200);

    return () => clearInterval(timer);
  }, [isPlaying, scenarioIndex]);

  return (
    <section id="demo" className="relative py-24 border-b border-border/60 bg-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3.5 border-border bg-surface px-3 py-1 text-xs gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-verified" />
            Signature Engine
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text mb-4">
            Watch a quote get checked, word for word.
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            LLMs often fabricate reasonable-sounding clauses. Clause intercepts every
            proposed quote and cryptographically tests its existence in your source text before you see it.
          </p>
        </div>

        {/* Demo Stage Container */}
        <div className="rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
          {/* Header Controls & Scenario Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-border bg-elevated/40">
            <div className="flex items-center gap-2">
              {SCENARIOS.map((sc, idx) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    setScenarioIndex(idx);
                    setCurrentStep(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    scenarioIndex === idx
                      ? "bg-surface border border-border text-text shadow-sm"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {sc.title}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-8 px-2.5 text-xs gap-1.5 border-border bg-surface text-muted hover:text-text"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? "Pause Demo" : "Auto-Play"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="h-8 px-2 text-xs text-muted hover:text-text"
                title="Restart Step"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Interactive Step Navigator */}
          <div className="grid grid-cols-3 border-b border-border bg-surface text-center text-xs font-mono">
            {[
              { num: 1, label: "1. Model Drafts Quote", icon: Cpu },
              { num: 2, label: "2. Server Scans Offsets", icon: Search },
              { num: 3, label: "3. Cryptographic Verdict", icon: Binary },
            ].map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              return (
                <button
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-center justify-center gap-2 py-3 px-2 border-r last:border-r-0 border-border transition-colors ${
                    isActive
                      ? "bg-elevated text-accent font-semibold border-b-2 border-b-accent"
                      : "text-muted hover:text-text bg-surface/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">Step {step.num}</span>
                </button>
              );
            })}
          </div>

          {/* Step Body Content Display */}
          <div className="p-6 sm:p-8 min-h-[280px] flex flex-col justify-center">
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-mono">PROPOSED_EXTRACT_CANDIDATE</span>
                  <Badge variant="outline" className="text-[10px]">Step 1 of 3</Badge>
                </div>
                <div className="rounded-lg border border-border bg-elevated/60 p-4 font-mono text-sm leading-relaxed text-text">
                  <span className="text-muted/60 select-none">&quot;</span>
                  <span className="text-accent underline decoration-accent/50 underline-offset-4 font-medium">
                    {scenario.quote}
                  </span>
                  <span className="text-muted/60 select-none">&quot;</span>
                </div>
                <p className="text-xs text-muted">
                  The model extracts this candidate clause to support its generated answer. The string has not yet been accepted.
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-mono">NORMALIZED_OFFSET_SCAN</span>
                  <Badge variant="outline" className="text-[10px] text-accent border-accent/30 animate-pulse">
                    Scanning Document Text...
                  </Badge>
                </div>

                <div className="rounded-lg border border-border bg-elevated/60 p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-muted pb-2 border-b border-border/40">
                    <span>Algorithm: Whitespace-tolerant exact offset search</span>
                    <span className="text-accent">Document: 42 pages</span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface border border-border">
                    <div className="h-full w-2/3 bg-accent animate-[pulse_1.5s_infinite]" />
                  </div>

                  <div className="text-[11px] text-muted space-y-1">
                    <div>Query: <span className="text-text truncate inline-block max-w-sm align-bottom">{scenario.quote}</span></div>
                    <div>Rules: Case-insensitive, line-break invariant, hyphenation resolved</div>
                  </div>
                </div>

                <p className="text-xs text-muted">
                  Clause searches through the document full text buffer, ignoring formatting quirks, OCR line wraps, and whitespace variances.
                </p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-mono">SERVER_VERDICT_RESULT</span>
                  <Badge variant="outline" className="text-[10px]">Final Assessment</Badge>
                </div>

                <div
                  className={`rounded-lg border p-5 space-y-3 ${
                    scenario.matched
                      ? "border-verified/40 bg-verified/10 text-text"
                      : "border-unverified/40 bg-unverified/10 text-text"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {scenario.matched ? (
                        <CheckCircle2 className="h-5 w-5 text-verified" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-unverified" />
                      )}
                      <span className="font-mono text-sm font-bold tracking-wider">
                        {scenario.verdict}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-muted">
                      {scenario.offset}
                    </span>
                  </div>

                  <blockquote className="font-mono text-xs text-text border-l-2 pl-3 border-current leading-relaxed">
                    &quot;{scenario.quote}&quot;
                  </blockquote>

                  <div className="pt-2 text-xs text-muted border-t border-current/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span>{scenario.verdictDetail}</span>
                    <span className="font-semibold text-text font-mono shrink-0">
                      {scenario.page}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

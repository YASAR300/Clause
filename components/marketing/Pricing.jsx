"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Loader2, Sparkles, ShieldCheck } from "lucide-react";

export function Pricing() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleJoinWaitlist = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to join waitlist.");
      }

      if (data.alreadyExists) {
        toast.info(data.message || "You are already on the waitlist!");
      } else {
        toast.success(data.message || "You have been added to the waitlist!");
        setEmail("");
      }
    } catch (err) {
      toast.error(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="pricing" className="py-24 border-b border-border/60 bg-bg">
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge
            variant="outline"
            className="mb-3.5 border-border bg-surface px-3 py-1 text-xs"
          >
            Transparent Terms
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text mb-4">
            Simple, honest pricing.
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Clause is free to use right now with full analysis and verification features.
            Team accounts with shared organization repositories are coming soon.
          </p>
        </div>

        {/* Pricing Cards Grid (2 cards only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          {/* Card 1: Free */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-border bg-surface/80 p-8 shadow-xl transition-all hover:border-border-strong">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                  Standard Tier
                </span>
                <Badge variant="outline" className="border-verified/40 bg-verified/10 text-verified text-[11px]">
                  Current Release
                </Badge>
              </div>

              <h3 className="text-2xl font-bold text-text mb-1">Free</h3>
              <p className="text-xs text-muted mb-6">
                Everything you need to interrogate and verify any contract.
              </p>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold tracking-tight text-text">$0</span>
                <span className="text-xs text-muted font-mono">/ forever</span>
              </div>

              <div className="space-y-3 mb-8 text-xs text-muted">
                {[
                  "Unlimited PDF and DOCX uploads (up to 150+ pages)",
                  "Cryptographic quote verification on every answer",
                  "Click-to-highlight citation jumping directly in document",
                  "Cross-document interrogation (up to 5 active files)",
                  "Redline version comparison with significance ranking",
                  "Full extraction transparency and coverage auditing",
                ].map((feat) => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-verified shrink-0 mt-0.5" />
                    <span className="text-text/90 leading-tight">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/dashboard">
              <Button size="lg" className="w-full bg-white text-bg hover:bg-white/90 gap-2 font-medium">
                Open Clause
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Card 2: Team (Coming Soon) */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-accent/40 bg-surface/80 p-8 shadow-xl transition-all hover:border-accent/60">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                  Collaboration
                </span>
                <Badge className="bg-accent/20 text-accent border-accent/40 text-[11px]">
                  Coming Soon
                </Badge>
              </div>

              <h3 className="text-2xl font-bold text-text mb-1">Team</h3>
              <p className="text-xs text-muted mb-6">
                For legal, procurement, and deal teams reviewing at scale.
              </p>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold tracking-tight text-text">$49</span>
                <span className="text-xs text-muted font-mono">/ seat / month (waitlist)</span>
              </div>

              <div className="space-y-3 mb-8 text-xs text-muted">
                {[
                  "Everything in Free, plus:",
                  "Shared team workspace & centralized contract library",
                  "Automated playbook checks against standard clauses",
                  "Granular permissioning, SSO, and complete audit logging",
                  "Priority throughput with dedicated rate-limit tier",
                  "Export verified audit reports in PDF and Markdown",
                ].map((feat, idx) => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <Check
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        idx === 0 ? "text-accent" : "text-verified"
                      }`}
                    />
                    <span className="text-text/90 leading-tight">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Waitlist Form */}
            <form onSubmit={handleJoinWaitlist} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="h-10 text-xs bg-elevated border-border"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-4 text-xs font-medium bg-accent hover:bg-accent/90 shrink-0 gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Join waitlist</span>
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted tracking-tight text-center">
                Early access invitations sent weekly. No spam ever.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

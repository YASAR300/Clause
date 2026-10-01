import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="relative py-20 overflow-hidden border-b border-border/60 bg-gradient-to-b from-surface/50 to-bg text-center">
      {/* Background Arc Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-accent/15 blur-[100px] rounded-full"
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-text mb-4">
          Contract answers you can trust, word for word.
        </h2>
        <p className="text-sm sm:text-base text-muted max-w-xl mx-auto mb-8 leading-relaxed">
          Upload any PDF or DOCX agreement. Check indemnities, liabilities, and covenants with
          cryptographic certainty.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="h-11 px-7 rounded-full bg-white text-bg hover:bg-white/90 font-medium text-sm gap-2 shadow-lg shadow-white/5"
            >
              Start analysing now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-6 rounded-full border-border bg-surface text-text hover:bg-elevated text-sm"
            >
              How it works
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

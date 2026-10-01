import { UploadCloud, MessageSquare, ShieldCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  {
    step: "01",
    title: "Upload",
    headline: "Ingest PDF or DOCX",
    description:
      "Upload agreements up to 150+ pages. Clause extracts the full text, maps exact character coordinates per page, and segments clauses into searchable vectors.",
    icon: UploadCloud,
  },
  {
    step: "02",
    title: "Ask",
    headline: "Interrogate in Plain English",
    description:
      "Ask about indemnities, termination convenience, governing law, or auto-renewals. The engine runs concurrent vector and full-text searches across all pages.",
    icon: MessageSquare,
  },
  {
    step: "03",
    title: "Verify",
    headline: "Cryptographic Sentence Proof",
    description:
      "Every answer is checked against the raw document buffer. Quotes that fail character verification are rejected, ensuring zero hallucinations.",
    icon: ShieldCheck,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 border-b border-border/60 bg-bg">
      <div className="mx-auto max-w-5xl px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge
            variant="outline"
            className="mb-3.5 border-border bg-surface px-3 py-1 text-xs"
          >
            Three-Step Pipeline
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text mb-4">
            How verification works under the hood.
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            From file drop to verified answer in seconds. No complicated setup, no opaque summaries.
          </p>
        </div>

        {/* Steps with Animated Connecting Line */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Subtle horizontal connecting line on desktop */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden md:block absolute top-7 left-12 right-12 h-[1px] bg-gradient-to-r from-accent/20 via-verified/40 to-accent/20 z-0"
          />

          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative z-10 flex flex-col items-start p-6 rounded-xl border border-border bg-surface/70 shadow-sm transition-all hover:border-border-strong hover:bg-surface"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-elevated text-accent mb-6 shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex items-center gap-2 mb-2 font-mono text-xs text-muted">
                  <span className="text-accent font-semibold">{item.step}</span>
                  <span>/</span>
                  <span className="uppercase tracking-wider">{item.title}</span>
                </div>

                <h3 className="text-lg font-semibold text-text mb-2">
                  {item.headline}
                </h3>

                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

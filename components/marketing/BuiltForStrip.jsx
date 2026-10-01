import {
  Scale,
  Building2,
  Compass,
  ShieldCheck,
  Calculator,
} from "lucide-react";

const AUDIENCES = [
  { label: "Legal teams", icon: Scale, description: "Covenant cross-referencing" },
  { label: "Procurement", icon: Building2, description: "Vendor terms validation" },
  { label: "Founders", icon: Compass, description: "Investor and SAFE review" },
  { label: "Compliance", icon: ShieldCheck, description: "Regulatory clause audits" },
  { label: "Finance", icon: Calculator, description: "Payment and liability caps" },
];

export function BuiltForStrip() {
  return (
    <section className="relative py-12 border-y border-border/60 bg-surface/30">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-muted/70 mb-8">
          Built for teams who cannot afford hallucinated clauses
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {AUDIENCES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-surface/50 transition-colors hover:border-border-strong hover:bg-surface/80"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-text">{item.label}</div>
                  <div className="text-[11px] text-muted truncate">{item.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

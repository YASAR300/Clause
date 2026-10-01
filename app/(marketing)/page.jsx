import { Navbar } from "@/components/marketing/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { HeroMockup } from "@/components/marketing/HeroMockup";
import { BuiltForStrip } from "@/components/marketing/BuiltForStrip";

export default function MarketingPage() {
  return (
    <div className="relative min-h-screen bg-bg text-text selection:bg-accent/30 selection:text-white">
      {/* Background Arc / Halo Glow under Hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] opacity-40 z-0 overflow-hidden"
      >
        <div className="w-full h-full rounded-[100%] border border-accent/20 bg-gradient-to-b from-accent/10 to-transparent blur-[1px]" />
      </div>

      <Navbar />

      <main className="relative z-10">
        <Hero />
        <HeroMockup />
        <BuiltForStrip />
      </main>
    </div>
  );
}

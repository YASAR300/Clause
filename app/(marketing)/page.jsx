import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowRight, FileSearch, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Clause Logo"
              width={32}
              height={32}
              className="rounded-md object-contain"
              priority
            />
            <span className="text-lg font-semibold tracking-tight text-text">
              Clause
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href="/documents">
              <Button size="sm">
                Analyze Contract
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <Badge variant="outline" className="mb-6 gap-2 border-border bg-surface px-3 py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-verified" />
          Server-Verified Quotations & Zero Hallucinations
        </Badge>

        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl text-text">
          Precision Legal Intelligence backed by{" "}
          <span className="text-accent">verified document ground truth</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted">
          Upload PDF and DOCX agreements, interrogate covenants and liabilities in
          natural language, and verify every single answer against cryptographic
          offsets in your original contract.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/documents">
            <Button size="lg" className="gap-2">
              <FileSearch className="h-5 w-5" />
              Upload Agreement
            </Button>
          </Link>
          <Link href="/waitlist">
            <Button variant="outline" size="lg" className="gap-2">
              <Sparkles className="h-5 w-5" />
              Join Waitlist
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted">
        <div className="mx-auto max-w-7xl px-6">
          © {new Date().getFullYear()} Clause Inc. Built for legal accuracy.
        </div>
      </footer>
    </div>
  );
}

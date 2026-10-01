"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log unexpected client-side error boundaries silently if needed
  }, [error]);

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between p-6">
      <header className="max-w-6xl mx-auto w-full py-4">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/40 bg-danger/10 text-danger mb-6 shadow-lg shadow-danger/10">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <Badge variant="outline" className="mb-4 text-xs font-mono border-danger/40 text-danger">
          500 // Execution Error
        </Badge>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text mb-3">
          Something went wrong
        </h1>

        <p className="text-xs sm:text-sm text-muted mb-8 leading-relaxed">
          An unexpected error occurred during execution. You can attempt to retry the action
          or return to the safety of the main dashboard.
        </p>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => reset()}
            size="sm"
            className="bg-accent hover:bg-accent/90 text-white gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>

          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-muted/60 py-4">
        © {new Date().getFullYear()} Clause Inc. All rights reserved.
      </footer>
    </div>
  );
}

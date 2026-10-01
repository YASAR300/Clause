import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between p-6">
      <header className="max-w-6xl mx-auto w-full py-4">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-accent mb-6 shadow-lg shadow-accent/10">
          <FileQuestion className="h-7 w-7" />
        </div>

        <Badge variant="outline" className="mb-4 text-xs font-mono">
          404 // Clause Not Found
        </Badge>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text mb-3">
          Page does not exist
        </h1>

        <p className="text-xs sm:text-sm text-muted mb-8 leading-relaxed">
          The contract route or citation you requested could not be located on the server.
          Please check the URL or navigate back to the workspace.
        </p>

        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return Home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="bg-accent text-white">
              Open Dashboard
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

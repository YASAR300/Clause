"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }) {
  useEffect(() => {
    console.error("App boundary error caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 border border-danger/30 text-danger mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>

      <h1 className="text-lg font-semibold text-text mb-1">
        Something unexpected occurred
      </h1>
      <p className="text-xs text-muted max-w-md mb-6 leading-relaxed">
        {error?.message || "An error occurred while loading this workspace view. Please retry or return to the overview."}
      </p>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          size="sm"
          className="h-8 text-xs bg-accent hover:bg-accent-hover text-white gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </Button>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
        >
          <Link href="/dashboard">
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

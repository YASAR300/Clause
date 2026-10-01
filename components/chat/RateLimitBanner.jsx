"use client";

import { Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RateLimitBanner({ message, retryIn }) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-md border border-unverified/40 bg-unverified/10 px-3.5 py-2 text-xs text-unverified animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-unverified" />
      <span className="font-medium">{message}</span>
      {typeof retryIn === "number" && retryIn > 0 && (
        <Badge
          variant="outline"
          className="ml-auto border-unverified/30 bg-unverified/20 text-unverified px-1.5 py-0 text-[10px]"
        >
          <Clock className="mr-1 h-3 w-3" />
          {retryIn}s
        </Badge>
      )}
    </div>
  );
}

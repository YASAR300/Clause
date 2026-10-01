import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent text-white shadow hover:bg-accent/80",
        secondary:
          "border-border bg-surface text-text hover:bg-elevated",
        destructive:
          "border-transparent bg-danger text-white shadow hover:bg-danger/80",
        outline: "text-text border-border",
        verified:
          "border-verified/30 bg-verified/10 text-verified",
        unverified:
          "border-unverified/30 bg-unverified/10 text-unverified",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

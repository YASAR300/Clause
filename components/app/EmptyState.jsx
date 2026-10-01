import Link from "next/link";
import { FileText, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

function renderAction(action, defaultVariant = "default") {
  if (!action) return null;
  if (typeof action === "object" && "label" in action) {
    if (action.href) {
      return (
        <Button asChild variant={action.variant || defaultVariant} size="sm">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      );
    }
    return (
      <Button
        variant={action.variant || defaultVariant}
        size="sm"
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    );
  }
  return action;
}

export function EmptyState({
  icon: Icon = FileText,
  title = "No documents found",
  description = "Get started by uploading a contract or trying a sample document.",
  primaryAction = null,
  secondaryAction = null,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-border bg-surface/40 max-w-lg mx-auto ${className}`}
    >
      {/* Visual Illustration */}
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-elevated text-accent shadow-md">
        <Icon className="h-8 w-8 text-accent" />
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-verified animate-ping" />
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-verified" />
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-text mb-1.5">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-muted mb-6 max-w-sm leading-relaxed">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {renderAction(primaryAction, "default")}
          {renderAction(secondaryAction, "outline")}
        </div>
      )}
    </div>
  );
}

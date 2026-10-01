import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  breadcrumbs = [],
  title,
  description,
  actions = null,
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/60 mb-6">
      <div className="space-y-1">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-muted mb-1 font-mono">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={idx} className="flex items-center gap-1.5">
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-text transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "text-text font-medium" : ""}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="h-3 w-3 text-muted/60" />}
                </span>
              );
            })}
          </nav>
        )}

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-text">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-muted">{description}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </header>
  );
}

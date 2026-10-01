import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-2 pb-5 border-b border-border">
        <Skeleton className="h-4 w-32 bg-surface" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48 bg-surface" />
          <Skeleton className="h-8 w-28 bg-surface" />
        </div>
        <Skeleton className="h-3.5 w-72 bg-surface" />
      </div>

      {/* Metric / Toolbar Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-surface space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-20 bg-surface-hover" />
              <Skeleton className="h-4 w-4 rounded-full bg-surface-hover" />
            </div>
            <Skeleton className="h-6 w-16 bg-surface-hover" />
            <Skeleton className="h-2.5 w-28 bg-surface-hover" />
          </div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="flex justify-between items-center pb-3 border-b border-border/60">
          <Skeleton className="h-4 w-36 bg-surface-hover" />
          <Skeleton className="h-7 w-48 bg-surface-hover" />
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-3 rounded bg-surface-hover/30"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded bg-surface-hover" />
                <Skeleton className="h-4 w-48 bg-surface-hover" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16 bg-surface-hover" />
                <Skeleton className="h-4 w-12 bg-surface-hover" />
                <Skeleton className="h-4 w-20 bg-surface-hover" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

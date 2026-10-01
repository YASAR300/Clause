export function formatRelativeTime(dateInput) {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 45) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "yesterday";
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function RelativeTime({ date, className = "" }) {
  if (!date) return <span className={className}>—</span>;
  const d = new Date(date);
  const formatted = formatRelativeTime(d);
  const fullText = d.toLocaleString();

  return (
    <time dateTime={d.toISOString()} title={fullText} className={className}>
      {formatted}
    </time>
  );
}

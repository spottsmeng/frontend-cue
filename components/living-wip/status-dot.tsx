// PRD §12.1: "semantic colour... never the sole carrier of meaning" — the
// dot is always paired with its own text label at the call site, never
// relied on alone.
const TOKEN: Record<"good" | "warning" | "serious" | "critical" | "muted", string> = {
  good: "bg-good",
  warning: "bg-warning",
  serious: "bg-serious",
  critical: "bg-critical",
  muted: "bg-ink-muted",
};

export function StatusDot({ tone }: { tone: keyof typeof TOKEN }) {
  return <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${TOKEN[tone]}`} />;
}

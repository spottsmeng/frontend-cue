export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-linear-to-br from-signal to-dusk font-mono text-sm font-bold text-white">
          CQ
        </span>
        <span className="text-lg font-semibold tracking-tight text-ink">CUE</span>
      </div>
      <p className="max-w-md text-sm text-ink-secondary">
        Design tokens are wired (<code className="rounded-sm bg-surface-sunk px-1.5 py-0.5 font-mono text-xs text-ink">app/globals.css</code>)
        — no application shell yet. That starts at{" "}
        <code className="rounded-sm bg-surface-sunk px-1.5 py-0.5 font-mono text-xs text-ink">Prompt F0 — Frontend Foundations.txt</code>.
      </p>
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-good" /> on-plan
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" /> watch
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-critical" /> risk
        </span>
      </div>
    </div>
  );
}

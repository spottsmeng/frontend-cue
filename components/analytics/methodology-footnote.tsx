/**
 * PRD §13's own closing line — "A metrics dashboard ships with the product
 * so Pico verifies these independently" — made a real, visible artefact
 * (not just a code comment), since Pico is a real audience for this
 * honesty, not just a future engineer reading source.
 */
export function MethodologyFootnote() {
  return (
    <div className="rounded-lg border border-border bg-surface-sunk px-4 py-3 text-xs text-ink-secondary">
      <p className="font-medium text-ink">What this dashboard can and can&apos;t show yet, and why</p>
      <p className="mt-1.5">
        PRD §13 commits CUE to shipping a metrics dashboard so Pico can verify its own claimed value
        independently, not take it on faith. Three of the ten §13 metrics are real, live numbers on
        this page: verification burden and write-back reply rate are computed here from the same
        commitment and write-back records you can inspect on each project&apos;s own Living WIP page;
        cost per project is read directly from the LLM usage ledger every extraction call writes to.
      </p>
      <p className="mt-1.5">
        The remaining seven are shown below with the specific, real reason they aren&apos;t
        measurable yet — a missing telemetry pipeline, a missing calendar integration, a schema
        decision nobody has made, or a ground-truth corpus that doesn&apos;t exist because Phase 0
        discovery hasn&apos;t run. None of them are hidden, and none of them are a fabricated number.
        A chart with no data looks unfinished; a chart with a fabricated number looks finished and
        lies — this dashboard chooses the former every time.
      </p>
    </div>
  );
}

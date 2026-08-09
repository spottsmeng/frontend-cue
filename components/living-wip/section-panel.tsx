/** DESIGN.md's layout concept: "sections as bounded panels with real
 * vertical rhythm" — one shared shell for all seven Living WIP sections. */
export function SectionPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

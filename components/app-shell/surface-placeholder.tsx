// F1–F9's own prompts build these surfaces for real — F0's job is only the
// routing skeleton they slot into (Prompt F0's own "EXPLICITLY OUT OF
// SCOPE" section). One shared placeholder, not eight near-identical files,
// since the only thing that varies is which milestone owns the surface.
export function SurfacePlaceholder({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="max-w-sm text-sm text-ink-muted">
        Not built yet — {milestone} adds this surface&rsquo;s real content on top of F0&rsquo;s shell.
      </p>
    </div>
  );
}

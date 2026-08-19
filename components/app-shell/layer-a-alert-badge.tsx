"use client";

import { useOpenLayerAAlertsCountQuery } from "@/lib/admin/layer-a-hooks";

/**
 * "Diagnosable by looking at a dashboard the next morning" means visible
 * before an admin even opens it — this is the locked design decision
 * behind putting a badge on TopNav's own Admin link, not just inside the
 * Layer A dashboard page. A small client leaf inside an otherwise-server
 * TopNav, the same pattern any other live client-side sliver would use
 * inside a server component that's rendered on every shell page.
 */
export function LayerAAlertBadge() {
  const { data } = useOpenLayerAAlertsCountQuery({ refetchInterval: 30_000 });
  const count = data?.count ?? 0;
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} open Layer A alert${count === 1 ? "" : "s"}`}
      className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 font-mono text-[10px] font-medium leading-none text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

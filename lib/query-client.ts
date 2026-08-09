import { QueryClient } from "@tanstack/react-query";

/**
 * Defaults reasoned from first principles, not pasted from TanStack's own
 * example config (Prompt F0's own instruction) — this is an internal ops
 * tool used over a real (occasionally flaky, occasionally slow) network,
 * not a public SPA optimized for perceived speed at any cost:
 *
 * - `staleTime: 60_000` — the TanStack default (`0`, always-stale) refetches
 *   on every mount and window focus. PRD §12.2's own "last ledger change"
 *   currency indicator is the UI's actual freshness signal ("never a
 *   refresh button"); a client that also refetches silently on every focus
 *   would burn requests with no matching UI change most of the time. One
 *   minute is short enough that a real edit elsewhere still shows up
 *   quickly on next navigation, long enough to stop refetch storms from
 *   tab-switching during a normal work session.
 * - `retry: 2` (not the default 3) — a real backend error should surface
 *   to the user in a few seconds, not after three silent attempts first;
 *   this is a small, controlled internal deployment, not a public API
 *   client that has to tolerate an unreliable host.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 2,
      },
    },
  });
}

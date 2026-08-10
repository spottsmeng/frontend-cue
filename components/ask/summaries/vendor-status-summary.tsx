import { VendorStatusPanel } from "@/components/living-wip/sections/vendor-status-section";
import type { AskVendorStatusSummary } from "@/lib/api/types";

/**
 * `AskVendorStatusSummary` (`{vendors, reliability_data_available}`) is the
 * exact same shape as Living WIP's `VendorStatusSection` — reused directly
 * rather than a parallel renderer, per this milestone's own instruction.
 */
export function VendorStatusSummaryView({
  summary,
  onOpenCommitment,
}: {
  summary: AskVendorStatusSummary;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  return <VendorStatusPanel section={summary} onOpenCommitment={onOpenCommitment} />;
}

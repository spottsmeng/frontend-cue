import type { VendorStatusSection as VendorStatusSectionT } from "@/lib/api/types";

import { CommitmentSummaryRow } from "../commitment-summary-row";
import { EmptyState } from "../empty-state";
import { ReportField } from "../report-field";
import { SectionPanel } from "../section-panel";

export function VendorStatusPanel({
  section,
  onOpenCommitment,
}: {
  section: VendorStatusSectionT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  return (
    <SectionPanel title="Vendor status">
      {section.vendors.length === 0 ? (
        <EmptyState message="No vendor activity recorded on this project yet." />
      ) : (
        <ul className="flex flex-col gap-4">
          {section.vendors.map((vendor) => (
            <li key={vendor.party_id}>
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-sm font-medium text-ink">{vendor.party_name}</h3>
                <ReportField field={vendor.reliability} />
              </div>

              {vendor.outstanding_actions.length === 0 && vendor.confirmed_deliverables.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  {vendor.party_name} has no open or confirmed items yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {vendor.outstanding_actions.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-ink-muted">
                        Outstanding
                      </p>
                      <ul className="flex flex-col gap-1">
                        {vendor.outstanding_actions.map((c) => (
                          <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                        ))}
                      </ul>
                    </div>
                  )}
                  {vendor.confirmed_deliverables.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-ink-muted">
                        Confirmed
                      </p>
                      <ul className="flex flex-col gap-1">
                        {vendor.confirmed_deliverables.map((c) => (
                          <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!section.reliability_data_available && (
        <p className="mt-3 text-xs italic text-ink-muted">
          Vendor reliability metrics are not available yet — the Vendor Reliability Graph is a
          later milestone.
        </p>
      )}
    </SectionPanel>
  );
}

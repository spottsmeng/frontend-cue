import { useTranslations } from "next-intl";

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
  const t = useTranslations("livingWip.vendorStatus");
  return (
    <SectionPanel title={t("title")}>
      {section.vendors.length === 0 ? (
        <EmptyState message={t("empty")} />
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
                  {t("noItems", { name: vendor.party_name })}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {vendor.outstanding_actions.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-ink-muted">
                        {t("outstanding")}
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
                        {t("confirmed")}
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
        <p className="mt-3 text-xs italic text-ink-muted">{t("reliabilityUnavailable")}</p>
      )}
    </SectionPanel>
  );
}

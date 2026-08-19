import { useTranslations } from "next-intl";

import type { LayerAAlertType } from "@/lib/api/types";

/** Three distinct, human-legible labels — the locked design decision behind
 * this whole feature naming today's exact incident directly, not folding
 * it into a generic "disconnect" alert. Plain text, not a colored pill:
 * severity (rendered alongside, via the status quad) already carries the
 * urgency signal — this badge's only job is telling the three types apart. */
export function LayerAAlertTypeBadge({ alertType }: { alertType: LayerAAlertType }) {
  const t = useTranslations("admin.layerA.alertType");
  return (
    <span className="inline-flex items-center rounded-md border border-border-strong px-2 py-0.5 text-xs font-medium text-ink">
      {t(alertType)}
    </span>
  );
}

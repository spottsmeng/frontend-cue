import { useTranslations } from "next-intl";

import type { OntologyTermOut } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { formatSlackDays, nodeTone, type TimelineNode } from "@/lib/twin/presentation";
import { resolveTermLabel } from "@/lib/twin/hooks";

/**
 * FR-TWN-11: a fixed milestone is structurally different, not a colour
 * variant — rendered as a locked square with a padlock glyph instead of the
 * ordinary round dot every other node gets, so the shape difference reads
 * even before the colour does (this milestone's own NON-OBVIOUS note).
 */
function NodeMarker({ isFixed, tone }: { isFixed: boolean; tone: "critical" | "good" }) {
  const t = useTranslations("twin.timelineNode");
  const fill = tone === "critical" ? "bg-critical" : "bg-good";
  if (isFixed) {
    return (
      <span
        aria-hidden
        title={t("fixedTitle")}
        className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm ${fill} text-[8px] leading-none text-white`}
      >
        🔒
      </span>
    );
  }
  return <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${fill}`} />;
}

export function TimelineNodeRow({
  node,
  milestoneTypes,
  isLast,
  onSelect,
}: {
  node: TimelineNode;
  milestoneTypes: OntologyTermOut[] | undefined;
  isLast: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("twin.timelineNode");
  const tone = nodeTone(node);
  // F9 gap-audit fix: F2's own documented debt — a milestone's type had no
  // resolver anywhere and was never displayed. `milestoneTypes` is the
  // same `milestone_type`-category list AddMilestoneForm's picker already
  // fetches (frontend/PROGRESS.md's F2 notes).
  const type = resolveTermLabel(milestoneTypes, node.typeTermId);
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center pt-1.5">
        <NodeMarker isFixed={node.isFixed} tone={tone} />
        {!isLast && <span aria-hidden className="mt-1 w-px flex-1 bg-border" />}
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="mb-4 flex flex-1 flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-left hover:border-signal"
      >
        <span className="flex items-center gap-2 text-sm text-ink">
          {node.name}
          {type && (
            <span className="rounded-full bg-surface-sunk px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
              {type.label_en}
            </span>
          )}
          {node.isFixed && (
            <span className="rounded-full bg-surface-sunk px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
              {t("fixed")}
            </span>
          )}
          {node.isCritical && (
            <span className="rounded-full bg-critical-soft px-1.5 py-0.5 text-[10px] font-medium text-critical">
              {t("criticalPath")}
            </span>
          )}
        </span>
        <span className="flex items-center gap-3 font-mono text-xs text-ink-muted">
          <span>{t("planned", { date: formatDateTime(node.plannedAt) })}</span>
          {node.actualAt && <span>{t("actual", { date: formatDateTime(node.actualAt) })}</span>}
          <span className={node.isCritical ? "text-critical" : undefined}>
            {formatSlackDays(node.slackDays)}
          </span>
        </span>
      </button>
    </li>
  );
}

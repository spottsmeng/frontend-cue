import type { EvidenceOut } from "@/lib/api/types";

/**
 * F9: resolves the real `lang` attribute for a vendor-content span
 * (`deliverable_original`, `description_original`, ...) from its
 * commitment/deviation's own linked evidence, rather than a hardcoded
 * guess — DESIGN.md's own rule ("never render evidence text without
 * setting lang from the API's own value") applied to fields that carry
 * evidence indirectly, not just EvidenceOut itself (components/living-wip/
 * evidence-viewer.tsx already does this correctly for the direct case).
 * `Evidence.language` is bcp47 (already zh-Hans/zh-Hant-capable per that
 * field's own docstring) — the first linked evidence item is the best
 * available signal for what language the record's own original content
 * was captured in. Returns `undefined` (no attribute, browser default)
 * rather than a wrong guess when there's no evidence to key off.
 */
export function contentLang(evidence: EvidenceOut[] | null | undefined): string | undefined {
  return evidence?.[0]?.language ?? undefined;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-SG", { dateStyle: "medium" }).format(new Date(iso));
}

export function formatMoney(value: number, currency: string | null | undefined): string {
  if (!currency) return value.toLocaleString("en-SG", { maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat("en-SG", { style: "currency", currency }).format(value);
  } catch {
    // An unrecognised/placeholder currency code (Intl throws on anything
    // outside real ISO 4217) — fall back to a plain amount rather than a
    // thrown render error, since Commitment.currency is caller-supplied
    // text, not itself validated against ISO 4217 beyond a 3-char length.
    return `${value.toLocaleString("en-SG", { maximumFractionDigits: 2 })} ${currency}`;
  }
}

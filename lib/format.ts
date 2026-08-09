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

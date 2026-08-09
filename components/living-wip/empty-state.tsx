/**
 * §12.2's own requirement: "explain what is missing and which vendor owes
 * it" — a status, not a generic "no data" placeholder. Every section below
 * that can be empty passes a message naming the specific gap (and the
 * responsible party, where the data has one) rather than reusing one
 * generic string.
 */
export function EmptyState({ message }: { message: string }) {
  return <p className="px-4 py-6 text-sm text-ink-muted">{message}</p>;
}

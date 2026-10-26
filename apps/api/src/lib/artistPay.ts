// What an artist earns every time someone sends one of their cards.
//
// Emerald, Oct 26: "$1.50 right now, but all prices are going to change" — so
// it lives HERE and nowhere else, and an env var can change it without a code
// change. Amounts are never shown anywhere in the app except an artist's own
// earnings panel.
export const ARTIST_EARNING_CENTS = Number(process.env.ARTIST_EARNING_CENTS ?? 150)

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// The month key we hang the featured five on, e.g. "2026-11"
export function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

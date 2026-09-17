/** Small formatting helpers shared by the creator dashboard. Safe on client and server. */
export const CURRENCIES = ["usd", "eur", "gbp", "cad", "aud"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function formatPrice(cents: number, currency: string) {
  if (!cents) return "Free";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/** "12.50" → 1250. Returns null when the input is not a valid non-negative amount. */
export function dollarsToCents(input: string): number | null {
  const s = input.trim().replace(/[$,\s]/g, "");
  if (s === "") return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

export function centsToDollars(cents: number) {
  return cents ? (cents / 100).toFixed(2) : "";
}

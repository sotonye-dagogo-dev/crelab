/**
 * All money in Crellab is stored as kobo (integer). These helpers are the
 * single conversion point between the naira values users enter/read and the
 * kobo values persisted in the database.
 */

/** Converts a naira amount (as entered in a form) to kobo, rounding safely. */
export function nairaToKobo(amountNaira: number): number {
  return Math.round(amountNaira * 100);
}

/** Formats a naira amount (not kobo) with thousands separators. */
export function formatNaira(naira: number): string {
  return `₦${naira.toLocaleString("en-NG")}`;
}

/** Formats a stored kobo amount as naira with thousands separators. */
export function formatKobo(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

/**
 * Safely formats a price value that might be in naira or kobo.
 * If the value is >= 10,000,000 (100k naira), assumes it's kobo and converts.
 * Otherwise treats it as naira.
 */
export function formatPriceSmart(value: number): string {
  if (value >= 10_000_000) {
    // Likely kobo (100k naira = 10M kobo)
    return formatKobo(value);
  }
  return formatNaira(value);
}

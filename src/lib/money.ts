/**
 * Money helpers. Amounts are stored as integer minor units (e.g. cents) to
 * avoid floating point drift. The number of decimals depends on the currency
 * (EUR = 2, JPY = 0).
 */

const decimalsCache = new Map<string, number>();

export function currencyDecimals(currency: string): number {
  const cached = decimalsCache.get(currency);
  if (cached !== undefined) return cached;
  let decimals = 2;
  try {
    decimals =
      new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    decimals = 2;
  }
  decimalsCache.set(currency, decimals);
  return decimals;
}

export function minorToMajor(minor: number, currency: string): number {
  return minor / 10 ** currencyDecimals(currency);
}

/**
 * Parse user input ("12,50", "12.5", "1 234.20") into integer minor units.
 * Returns undefined for empty or invalid input.
 */
export function parseAmountToMinor(input: string, currency: string): number | undefined {
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  if (cleaned === "" || !/^\d*\.?\d*$/.test(cleaned)) return undefined;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return undefined;
  return Math.round(value * 10 ** currencyDecimals(currency));
}

/** Format minor units as a currency string, e.g. 1250 EUR -> "€12.50". */
export function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      minorToMajor(minor, currency),
    );
  } catch {
    return `${minorToMajor(minor, currency).toFixed(currencyDecimals(currency))} ${currency}`;
  }
}

/** Plain major-unit string for inputs/CSV, e.g. 1250 EUR -> "12.50". */
export function minorToInputString(minor: number, currency: string): string {
  return minorToMajor(minor, currency).toFixed(currencyDecimals(currency));
}

/** Convert minor units of `currency` into EUR minor units using a manual rate. */
export function toEurMinor(minor: number, currency: string, rateToEur: number): number {
  if (currency === "EUR") return minor;
  return Math.round(minorToMajor(minor, currency) * rateToEur * 100);
}

export function formatEur(eurMinor: number): string {
  return formatMoney(eurMinor, "EUR");
}

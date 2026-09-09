export interface CurrencyOption {
  code: string;
  label: string;
  /** Rough starting point for the manual rate field; always user-editable. */
  suggestedRateToEur: number;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "EUR", label: "Euro", suggestedRateToEur: 1 },
  { code: "JPY", label: "Japanese Yen", suggestedRateToEur: 0.0061 },
  { code: "DKK", label: "Danish Krone", suggestedRateToEur: 0.134 },
  { code: "USD", label: "US Dollar", suggestedRateToEur: 0.92 },
  { code: "GBP", label: "British Pound", suggestedRateToEur: 1.17 },
  { code: "CHF", label: "Swiss Franc", suggestedRateToEur: 1.06 },
  { code: "SEK", label: "Swedish Krona", suggestedRateToEur: 0.088 },
  { code: "NOK", label: "Norwegian Krone", suggestedRateToEur: 0.086 },
  { code: "CZK", label: "Czech Koruna", suggestedRateToEur: 0.04 },
  { code: "HUF", label: "Hungarian Forint", suggestedRateToEur: 0.0026 },
  { code: "PLN", label: "Polish Zloty", suggestedRateToEur: 0.23 },
];

export function currencyOption(code: string): CurrencyOption | undefined {
  return CURRENCIES.find((c) => c.code === code);
}

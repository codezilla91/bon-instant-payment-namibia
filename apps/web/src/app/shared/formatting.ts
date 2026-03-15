const currencyFormatter = new Intl.NumberFormat('en-NA', {
  style: 'currency',
  currency: 'NAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

const dateTimeFormatter = new Intl.DateTimeFormat('en-NA', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export function formatNad(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (!normalizedCurrency || normalizedCurrency === 'NAD') {
    return formatNad(amount);
  }

  try {
    let formatter = currencyFormatterCache.get(normalizedCurrency);

    if (!formatter) {
      formatter = new Intl.NumberFormat('en-NA', {
        style: 'currency',
        currency: normalizedCurrency,
        currencyDisplay: 'code',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      currencyFormatterCache.set(normalizedCurrency, formatter);
    }

    return formatter.format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(2)}`;
  }
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

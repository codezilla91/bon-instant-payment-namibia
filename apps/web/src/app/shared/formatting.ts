const amountFormatter = new Intl.NumberFormat('en-NA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-NA', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export const MASKED_AMOUNT = '********';

export function formatNad(amount: number): string {
  return `NAD ${amountFormatter.format(amount)}`;
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase();
  const resolvedCurrency = normalizedCurrency || 'NAD';

  if (resolvedCurrency === 'NAD') {
    return formatNad(amount);
  }

  return `${resolvedCurrency} ${amountFormatter.format(amount)}`;
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

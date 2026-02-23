export function formatNumber(value: number, decimals?: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 0,
  });
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return value.toLocaleString('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return formatNumber(value / 1_000_000, 1) + 'M';
  if (value >= 1_000) return formatNumber(value / 1_000, 1) + 'K';
  return formatNumber(value);
}

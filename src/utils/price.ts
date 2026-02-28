import type { Currency } from '../context/SettingsContext';

const EUR_RATE = 0.85 * 0.85;

export function convertUsdToEur(usd: number) {
  return usd * EUR_RATE;
}

export function formatPrice(
  value: number | null | undefined,
  currency: Currency,
  placeholder = '—'
) {
  if (value === null || value === undefined) return placeholder;
  const numeric = currency === 'EUR' ? convertUsdToEur(value) : value;
  const symbol = currency === 'EUR' ? '€' : '$';
  return `${symbol}${numeric.toFixed(2)}`;
}

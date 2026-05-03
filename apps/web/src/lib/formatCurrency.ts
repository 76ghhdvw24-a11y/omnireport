const NO_DECIMAL_CURRENCIES = new Set(['CLP', 'COP', 'ARS', 'BRL', 'PEN']);

const SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20ac',
  GBP: '\u00a3',
  MXN: 'MX$',
  COP: 'COP$',
  ARS: 'AR$',
  BRL: 'R$',
  PEN: 'S/',
  CLP: 'CLP$',
};

export function getCurrencySymbol(currency: string | null | undefined): string {
  return SYMBOLS[currency || 'USD'] || (currency || 'USD') + ' ';
}

export function formatCurrency(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '';
  const cur = currency || 'USD';
  const symbol = getCurrencySymbol(cur);
  const noDecimals = NO_DECIMAL_CURRENCIES.has(cur);

  const formatted = noDecimals
    ? Math.round(amount).toLocaleString('es-CL')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `${symbol}${formatted}`;
}

export function formatNumberInput(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '';
  const cur = currency || 'USD';
  const noDecimals = NO_DECIMAL_CURRENCIES.has(cur);
  return noDecimals ? String(Math.round(amount)) : amount.toFixed(2);
}
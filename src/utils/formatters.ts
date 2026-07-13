export function formatPrice(amount: number | string, currencySymbol: string = 'د.ع'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${currencySymbol} 0`;
  return `${currencySymbol} ${num.toLocaleString()}`;
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB');
}

export function formatDateTime(dateStr: string | Date): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-GB');
}

export function getCurrencySymbol(code: string): string {
  const map: Record<string, string> = { IQD: 'د.ع', USD: '$', SAR: 'ر.س', AED: 'د.إ' };
  return map[code] || code;
}

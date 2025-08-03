/**
 * Formats a number in German locale format (1.234,56)
 * @param value - The number to format
 * @returns Formatted number as string (e.g., "1.234,56")
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,00';
  
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a currency value in German locale format (1.234,56 €)
 * @param value - The number to format
 * @returns Formatted currency string (e.g., "1.234,56 €")
 */
export function formatCurrency(value: number | string): string {
  return `${formatNumber(value)} €`;
}

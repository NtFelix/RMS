/**
 * Formats a number in German locale format (1.234,56)
 * @param value - The number to format
 * @returns Formatted number as string (e.g., "1.234,56")
 */
export function formatNumber(value: number | string, fractionDigits: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    // Return zero formatted with desired decimal places
    if (fractionDigits === 0) return '0';
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(0);
  }

  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(num);
}

/**
 * Formats a currency value in German locale format (1.234,56 €)
 * @param value - The number to format
 * @returns Formatted currency string (e.g., "1.234,56 €")
 */
export function formatCurrency(value: number | string): string {
  return `${formatNumber(value, 2)} €`;
}

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
 * Rounds a number to a specified number of decimal places
 * @param num - The number to round
 * @param decimals - The number of decimal places (default 3)
 * @returns Rounded number
 */
export function roundToDecimals(num: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Formats a currency value in German locale format (1.234,56 €)
 * @param value - The number to format
 * @returns Formatted currency string (e.g., "1.234,56 €")
 */
export function formatCurrency(value: number | string): string {
  return `${formatNumber(value, 2)} €`;
}

/**
 * Text for a month in the "Monatliche Vorauszahlungen" hover list (components/finance/abrechnung-modal.tsx).
 * Shows the formatted amount whenever the month was occupied (isActiveMonth) OR a payment was
 * credited to it — e.g. on the 360-day basis in 'Ist' mode a move-in mid-month can have 0
 * Rechentage while the real payment for that calendar month is still credited (see
 * utils/abrechnung-calculations.ts's calculatePrepayments). "-" only when neither applies.
 * @param payment - the month's amount and whether it was an active (occupied/Rechentage) month
 * @param format - currency formatter, so callers keep their own formatting
 * @returns the formatted amount, or "-" for a month without occupancy and without payment
 */
export function formatMonthlyPrepayment(
  payment: { amount: number; isActiveMonth: boolean },
  format: (value: number) => string = formatCurrency
): string {
  return payment.isActiveMonth || payment.amount !== 0 ? format(payment.amount) : "-";
}

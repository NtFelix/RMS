/**
 * Formats "PLZ Ort" for display. The DB stores plz as a numeric column, so it is left-padded
 * to 5 digits (1067 -> 01067). Legacy rows kept the PLZ inside `ort` ("10115 Berlin"); in that
 * case the PLZ is not prepended a second time.
 */
export function formatPlzOrt(plz?: number | string | null, ort?: string | null): string {
  const rawPlz = plz == null ? '' : String(plz).trim();
  const paddedPlz = /^\d{1,5}$/.test(rawPlz) ? rawPlz.padStart(5, '0') : rawPlz;
  const trimmedOrt = ort?.trim() ?? '';
  if (paddedPlz && trimmedOrt.startsWith(paddedPlz)) return trimmedOrt;
  return [paddedPlz, trimmedOrt].filter(Boolean).join(' ');
}

/** A PLZ is valid when empty or exactly 5 digits. */
export const PLZ_PATTERN = /^\d{5}$/;

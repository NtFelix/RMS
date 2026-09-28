/** A PLZ is valid when it is exactly 5 digits. */
export const PLZ_PATTERN = /^\d{5}$/;

export const PLZ_ERROR = 'Die Postleitzahl muss aus genau 5 Ziffern bestehen.';

/**
 * Validates a raw PLZ input. Empty input is allowed and yields `null`. The DB column is numeric,
 * so a valid PLZ is returned as a number; leading zeros are restored by `padPlz`/`formatPlzOrt`.
 */
export function parsePlz(raw: unknown): { value: number | null } | { error: string } {
  const trimmed = raw == null ? '' : String(raw).trim();
  if (trimmed === '') return { value: null };
  return PLZ_PATTERN.test(trimmed) ? { value: Number(trimmed) } : { error: PLZ_ERROR };
}

/** Left-pads a numeric PLZ to 5 digits (1067 -> "01067"); other input is returned trimmed. */
export function padPlz(plz?: number | string | null): string {
  const raw = plz == null ? '' : String(plz).trim();
  return /^\d{1,5}$/.test(raw) ? raw.padStart(5, '0') : raw;
}

/**
 * Formats "PLZ Ort" for display. Legacy rows kept the PLZ inside `ort` ("10115 Berlin"); in that
 * case the PLZ is not prepended a second time.
 */
export function formatPlzOrt(plz?: number | string | null, ort?: string | null): string {
  const paddedPlz = padPlz(plz);
  const trimmedOrt = ort?.trim() ?? '';
  if (paddedPlz && trimmedOrt.startsWith(paddedPlz)) return trimmedOrt;
  return [paddedPlz, trimmedOrt].filter(Boolean).join(' ');
}

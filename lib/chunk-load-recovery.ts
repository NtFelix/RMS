/**
 * Wiederherstellung nach einem ChunkLoadError.
 *
 * Typischer Fall: Ein Tab bleibt über einen Deploy hinweg offen, die alten
 * JS-Chunks existieren nicht mehr. Ein einmaliges Neuladen holt den neuen
 * Build. Ein Zeitstempel in sessionStorage verhindert Reload-Schleifen
 * (max. ein Reload pro Minute).
 */

export const CHUNK_RELOAD_STORAGE_KEY = 'chunk-load-reload-at'
export const CHUNK_RELOAD_MIN_INTERVAL_MS = 60_000

const CHUNK_ERROR_PATTERNS = [
  /Loading chunk [^\s]+ failed/i,
  /Loading CSS chunk [^\s]+ failed/i,
  /Failed to load chunk/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
]

/** Erkennt Chunk-Ladefehler anhand von Name und Meldung (Webpack und Turbopack). */
export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { name, message } = error as { name?: unknown; message?: unknown }
  if (name === 'ChunkLoadError') return true
  if (typeof message !== 'string') return false
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * Lädt die Seite neu, sofern in der letzten Minute noch kein Reload wegen
 * eines Chunk-Fehlers stattfand. Gibt zurück, ob ein Reload ausgelöst wurde.
 * Ist sessionStorage nicht nutzbar, wird nicht neu geladen (Schleifenschutz
 * hat Vorrang).
 */
export function reloadOnceForChunkError(
  now: number = Date.now(),
  reload: () => void = () => window.location.reload(),
): boolean {
  if (typeof window === 'undefined') return false
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY))
    if (Number.isFinite(last) && last > 0 && now - last < CHUNK_RELOAD_MIN_INTERVAL_MS) {
      return false
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now))
  } catch {
    return false
  }
  reload()
  return true
}

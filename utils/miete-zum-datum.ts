import type { MietEintragKurz } from "@/types/Mietverhaeltnis"

/** Rent history as passed by callers; null/undefined/[] mean "no history". */
type MietHistorie = MietEintragKurz[] | null | undefined

const ISO_TAG = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Normalizes a date to its calendar day as YYYY-MM-DD, or null if it is not a valid day.
 * Date objects use their local year/month/day (never toISOString(), which shifts the day in other timezones).
 */
function zuIsoTag(datum: string | Date): string | null {
  if (datum instanceof Date) {
    if (Number.isNaN(datum.getTime())) return null
    const jahr = String(datum.getFullYear()).padStart(4, "0")
    const monat = String(datum.getMonth() + 1).padStart(2, "0")
    const tag = String(datum.getDate()).padStart(2, "0")
    return `${jahr}-${monat}-${tag}`
  }
  const treffer = ISO_TAG.exec(datum)
  return treffer ? `${treffer[1]}-${treffer[2]}-${treffer[3]}` : null
}

/**
 * Reads a rent amount. Supabase may return numeric columns as strings.
 * null, undefined and blank strings are rejected, because Number(null) would silently count as 0 euro.
 */
function liesBetrag(wert: unknown): number | null {
  if (wert === null || wert === undefined) return null
  if (typeof wert === "string" && wert.trim() === "") return null
  const betrag = Number(wert)
  return Number.isFinite(betrag) ? betrag : null
}

/**
 * Returns the amount of the entry with the greatest gueltig_ab <= isoTag, or null if there is none.
 * Entries with an invalid date or amount are ignored. The input array is not mutated.
 * On equal gueltig_ab the first entry in the array wins.
 */
function findeBetrag(historie: MietHistorie, isoTag: string): number | null {
  if (!Array.isArray(historie)) return null

  let besterTag: string | null = null
  let besterBetrag: number | null = null

  for (const eintrag of historie) {
    const tag = typeof eintrag?.gueltig_ab === "string" ? zuIsoTag(eintrag.gueltig_ab) : null
    if (tag === null || tag > isoTag) continue
    const betrag = liesBetrag(eintrag.betrag)
    if (betrag === null) continue
    // ISO dates of the same format sort correctly as strings
    if (besterTag === null || tag > besterTag) {
      besterTag = tag
      besterBetrag = betrag
    }
  }

  return besterBetrag
}

/**
 * Monthly rent that applies on a given calendar day.
 * Uses the entry with the greatest gueltig_ab <= datum. If no such entry exists (empty history, or all entries
 * lie after datum), fallbackMiete applies.
 */
export function mieteZumDatum(
  historie: MietHistorie,
  datum: string | Date,
  fallbackMiete: number
): number {
  const isoTag = zuIsoTag(datum)
  if (isoTag === null) return fallbackMiete
  return findeBetrag(historie, isoTag) ?? fallbackMiete
}

/**
 * Monthly rent of a calendar month, taken on its first day (monatIndex0 is 0-based, 0 = January).
 *
 * Rule (deliberately simple, no day-level logic): the rent of the first day of the month applies to the whole month.
 * - An entry on the 1st or an earlier entry: that entry's amount applies.
 * - No entry on or before the 1st, but an entry later in the same month: fallbackMiete applies for that month,
 *   because the change has not yet taken effect on the 1st. The new amount starts with the next month.
 * - Empty history: fallbackMiete.
 */
export function mieteImMonat(
  historie: MietHistorie,
  jahr: number,
  monatIndex0: number,
  fallbackMiete: number
): number {
  if (!Number.isInteger(jahr) || !Number.isInteger(monatIndex0) || monatIndex0 < 0 || monatIndex0 > 11) {
    return fallbackMiete
  }
  const ersterTag = `${String(jahr).padStart(4, "0")}-${String(monatIndex0 + 1).padStart(2, "0")}-01`
  return findeBetrag(historie, ersterTag) ?? fallbackMiete
}

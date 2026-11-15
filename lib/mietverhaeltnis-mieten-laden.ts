import type { SupabaseClient } from "@supabase/supabase-js"
import type { MietEintragKurz } from "@/types/Mietverhaeltnis"

/*
 * Server helpers for the rent history. Not a server action (no "use server").
 *
 * Fail-soft by design: any error (also a missing table or column in an environment) yields an empty result,
 * so the payment overview keeps working with Wohnungen.miete. Error logs contain no IDs and no amounts.
 */

/** Maximum number of IDs per `.in(...)` query (keeps the request URL well below proxy limits). */
const ID_BLOCK_GROESSE = 100

interface MietHistorieZeile {
  mietverhaeltnis_id?: unknown
  gueltig_ab?: unknown
  betrag?: unknown
}

interface MieterZeile {
  id?: unknown
  mietverhaeltnis_id?: unknown
}

/** Unique, non-empty string IDs in input order. */
function eindeutigeIds(ids: string[]): string[] {
  const gesehen = new Set<string>()
  for (const id of ids) {
    if (typeof id === "string" && id.length > 0) gesehen.add(id)
  }
  return Array.from(gesehen)
}

function inBloecke(ids: string[]): string[][] {
  const bloecke: string[][] = []
  for (let i = 0; i < ids.length; i += ID_BLOCK_GROESSE) {
    bloecke.push(ids.slice(i, i + ID_BLOCK_GROESSE))
  }
  return bloecke
}

/** Reads a numeric column. null, undefined and blank strings are rejected, Number(null) would be 0. */
function liesBetragRoh(wert: unknown): number | null {
  if (wert === null || wert === undefined) return null
  if (typeof wert === "string" && wert.trim() === "") return null
  const zahl = Number(wert)
  return Number.isFinite(zahl) ? zahl : null
}

function warnung(nachricht: string, error?: { code?: unknown }): void {
  // Only the error code, never the message or any row data
  const code = typeof error?.code === "string" ? error.code : undefined
  console.warn(nachricht, code ? { code } : undefined)
}

/**
 * Loads the active rent history entries for the given tenancy IDs, grouped by tenancy.
 * Returns an empty map for an empty input (no query) and on any error (fail-soft).
 */
export async function ladeMietHistorien(
  supabase: SupabaseClient,
  mietverhaeltnisIds: string[]
): Promise<Map<string, MietEintragKurz[]>> {
  const ergebnis = new Map<string, MietEintragKurz[]>()
  const ids = eindeutigeIds(mietverhaeltnisIds)
  if (ids.length === 0) return ergebnis

  try {
    for (const block of inBloecke(ids)) {
      const { data, error } = await supabase
        .from("Mieter_Mietverhaeltnisse_Mieten")
        .select("mietverhaeltnis_id, gueltig_ab, betrag")
        .in("mietverhaeltnis_id", block)
        .is("geloescht_am", null)

      if (error) {
        warnung("Miethistorie konnte nicht geladen werden, Fallback auf Wohnungsmiete.", error)
        return new Map<string, MietEintragKurz[]>()
      }

      const zeilen: unknown = data
      if (!Array.isArray(zeilen)) continue

      for (const roh of zeilen as MietHistorieZeile[]) {
        if (typeof roh.mietverhaeltnis_id !== "string" || typeof roh.gueltig_ab !== "string") continue
        const betrag = liesBetragRoh(roh.betrag)
        if (betrag === null) continue

        const eintraege = ergebnis.get(roh.mietverhaeltnis_id) ?? []
        eintraege.push({ gueltig_ab: roh.gueltig_ab, betrag })
        ergebnis.set(roh.mietverhaeltnis_id, eintraege)
      }
    }
  } catch {
    warnung("Miethistorie konnte nicht geladen werden, Fallback auf Wohnungsmiete.")
    return new Map<string, MietEintragKurz[]>()
  }

  return ergebnis
}

/**
 * Maps tenant IDs to their tenancy IDs (mieter_id -> mietverhaeltnis_id). Tenants without a tenancy are not in the map.
 * Uses its own query, so the regular tenant selects do not depend on the column.
 * Returns an empty map for an empty input (no query) and on any error (fail-soft).
 */
export async function ladeMietverhaeltnisIds(
  supabase: SupabaseClient,
  mieterIds: string[]
): Promise<Map<string, string>> {
  const ergebnis = new Map<string, string>()
  const ids = eindeutigeIds(mieterIds)
  if (ids.length === 0) return ergebnis

  try {
    for (const block of inBloecke(ids)) {
      const { data, error } = await supabase
        .from("Mieter")
        .select("id, mietverhaeltnis_id")
        .in("id", block)

      if (error) {
        warnung("Mietverhältnis-Zuordnung konnte nicht geladen werden, Fallback auf Wohnungsmiete.", error)
        return new Map<string, string>()
      }

      const zeilen: unknown = data
      if (!Array.isArray(zeilen)) continue

      for (const roh of zeilen as MieterZeile[]) {
        if (typeof roh.id !== "string" || typeof roh.mietverhaeltnis_id !== "string") continue
        ergebnis.set(roh.id, roh.mietverhaeltnis_id)
      }
    }
  } catch {
    warnung("Mietverhältnis-Zuordnung konnte nicht geladen werden, Fallback auf Wohnungsmiete.")
    return new Map<string, string>()
  }

  return ergebnis
}

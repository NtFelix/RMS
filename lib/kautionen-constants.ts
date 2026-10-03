/**
 * Constants for the deposit management ("Kautionsmanagement", GH-6).
 *
 * Deliberately NOT a "use server" file: "use server" modules may only export async functions, and
 * these values are needed in client components as well as in server actions.
 *
 * Display texts only. All business rules (balance, state, deadlines) are calculated by the
 * database, nothing in here is a source of truth for them. The limits below mirror the CHECK
 * constraints of the database for early, friendly validation; the database stays authoritative.
 */

import type {
  KautionAbzugKategorie,
  KautionArt,
  KautionBewegungsArt,
  KautionFristStufe,
  KautionZustand,
} from "@/types/Kaution";

// ---------------------------------------------------------------------------
// Deposit types
// ---------------------------------------------------------------------------

export const KAUTION_ARTEN = ["barkaution", "sparbuch", "buergschaft", "versicherung"] as const satisfies readonly KautionArt[];

export const KAUTION_ART_LABELS: Record<KautionArt, string> = {
  barkaution: "Barkaution",
  sparbuch: "Sparbuch",
  buergschaft: "Bürgschaft",
  versicherung: "Versicherung",
};

/**
 * Deposit types the RPCs accept in the currently shipped phase (DECISION-16: the CHECK lists in
 * the database are complete from the start, the RPCs release values phase by phase).
 * Phase 1: bar deposit only. Extend this list together with the database in phase 3.
 */
export const KAUTION_ARTEN_VERFUEGBAR: readonly KautionArt[] = ["barkaution"];

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export const KAUTION_BEWEGUNGSARTEN = ["einzahlung", "zinsgutschrift", "auszahlung", "abzug"] as const satisfies readonly KautionBewegungsArt[];

export const KAUTION_BEWEGUNGSART_LABELS: Record<KautionBewegungsArt, string> = {
  einzahlung: "Einzahlung",
  zinsgutschrift: "Zinsgutschrift",
  auszahlung: "Auszahlung",
  abzug: "Abzug",
};

/** Booking types the RPCs accept in the currently shipped phase. Phase 3 adds `zinsgutschrift`. */
export const KAUTION_BEWEGUNGSARTEN_VERFUEGBAR: readonly KautionBewegungsArt[] = ["einzahlung", "auszahlung", "abzug"];

export const KAUTION_ABZUG_KATEGORIEN = ["schaden", "mietrueckstand", "nebenkosten", "sonstiges"] as const satisfies readonly KautionAbzugKategorie[];

export const KAUTION_ABZUG_KATEGORIE_LABELS: Record<KautionAbzugKategorie, string> = {
  schaden: "Schäden",
  mietrueckstand: "Mietrückstand",
  nebenkosten: "Nebenkosten",
  sonstiges: "Sonstiges",
};

// ---------------------------------------------------------------------------
// Derived state and deadlines (display only)
// ---------------------------------------------------------------------------

export const KAUTION_ZUSTAND_LABELS: Record<KautionZustand, string> = {
  offen: "Offen",
  teilweise: "Teilweise eingegangen",
  verwahrt: "Verwahrt",
  in_rueckzahlung: "In Rückzahlung",
  abgeschlossen: "Abgeschlossen",
  dokumentiert: "Dokumentiert",
};

/**
 * Thresholds in months after the end of the tenancy, used for display texts only.
 * The database calculates the deadline level (`kaution_frist_stufe`), the app never does.
 * LEGAL-1/3: the thresholds are guide values, not statutory deadlines. Wording needs a legal review
 * before release.
 */
export const KAUTION_FRIST_SCHWELLEN_MONATE = { zeitnah: 3, richtwert: 6 } as const;

export const KAUTION_FRIST_STUFE_LABELS: Record<KautionFristStufe, string> = {
  keine: "Keine Frist",
  zeitnah: "Zeitnah auszahlen",
  richtwert_ueberschritten: "Richtwert überschritten",
};

/** Full texts for the deadline badge. Neutral wording: never "überfällig" (LEGAL-1/3). */
export const KAUTION_FRIST_STUFE_TEXTE: Record<Exclude<KautionFristStufe, "keine">, string> = {
  zeitnah: `Zeitnah auszahlen – das Mietverhältnis ist seit mehr als ${KAUTION_FRIST_SCHWELLEN_MONATE.zeitnah} Monaten beendet.`,
  richtwert_ueberschritten: `Richtwert überschritten – das Mietverhältnis ist seit mehr als ${KAUTION_FRIST_SCHWELLEN_MONATE.richtwert} Monaten beendet.`,
};

// ---------------------------------------------------------------------------
// Limits (mirror the database CHECK constraints)
// ---------------------------------------------------------------------------

/** Earliest allowed value date, `YYYY-MM-DD` (database: not before 1990-01-01). */
export const KAUTION_MIN_WERTSTELLUNG = "1990-01-01";

/** Text lengths in characters, counted after `trim()`. */
export const KAUTION_TEXT_LIMITS = {
  /** Reason of a payout or deduction (mandatory there). */
  grund: { min: 3, max: 500 },
  /** Reason of a cancellation (mandatory). */
  stornoGrund: { min: 3, max: 500 },
  interneNotiz: { max: 2000 },
  empfaenger: { max: 200 },
} as const;

// ---------------------------------------------------------------------------
// Type guards for untrusted input (server actions receive arbitrary client values)
// ---------------------------------------------------------------------------

export function isKautionArt(value: unknown): value is KautionArt {
  return typeof value === "string" && (KAUTION_ARTEN as readonly string[]).includes(value);
}

export function isKautionBewegungsArt(value: unknown): value is KautionBewegungsArt {
  return typeof value === "string" && (KAUTION_BEWEGUNGSARTEN as readonly string[]).includes(value);
}

export function isKautionAbzugKategorie(value: unknown): value is KautionAbzugKategorie {
  return typeof value === "string" && (KAUTION_ABZUG_KATEGORIEN as readonly string[]).includes(value);
}

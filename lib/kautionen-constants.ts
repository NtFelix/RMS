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
  KautionAbrechnungArt,
  KautionAbzugKategorie,
  KautionArt,
  KautionBewegungsArt,
  KautionFristStufe,
  KautionRateStatus,
  KautionZinsmethode,
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
 * Phase 3: all four types. Without a flag payload the dialog still offers only `KAUTION_ARTEN_STANDARD`.
 */
export const KAUTION_ARTEN_VERFUEGBAR: readonly KautionArt[] = ["barkaution", "sparbuch", "buergschaft", "versicherung"];

/**
 * Deposit types offered without a usable flag payload (phase 1 default: bar deposit only). Kept apart from
 * `KAUTION_ARTEN_VERFUEGBAR`, so that releasing a type for the RPCs does not switch it on for every user.
 */
export const KAUTION_ARTEN_STANDARD: readonly KautionArt[] = ["barkaution"];

/** Deposit types with a bank account (Konto): interest, instalments, bookings. Guarantee and insurance have none. */
export const KAUTION_KONTO_ARTEN = ["barkaution", "sparbuch"] as const satisfies readonly KautionArt[];

/** Whether the deposit type has a bank account (`KAUTION_KONTO_ARTEN`). */
export function kautionHatKonto(art: KautionArt): boolean {
  return (KAUTION_KONTO_ARTEN as readonly string[]).includes(art);
}

/** Agreement fields that belong to a bank account (Konto). */
export const KAUTION_KONTO_FELDER = ["iban", "bank", "kontoinhaber", "getrennt_angelegt"] as const;

/** Agreement fields that document a guarantee or an insurance (no account). */
export const KAUTION_DOKUMENT_FELDER = ["buerge_versicherer", "urkundennummer"] as const;

/** Agreement fields that depend on the deposit type. `zinsmethode` is allowed for every type (default `act_365`). */
export type KautionVereinbarungsFeld =
  | (typeof KAUTION_KONTO_FELDER)[number]
  | (typeof KAUTION_DOKUMENT_FELDER)[number]
  | "zinsmethode";

/**
 * Which agreement fields belong to which deposit type. Any other field has to stay empty for that type (the
 * database rejects it with `KA004`). `zinsmethode` is listed for every type because the database accepts it there;
 * it only has an effect for the account types.
 */
export const KAUTION_VEREINBARUNGSFELDER_JE_ART: Record<KautionArt, readonly KautionVereinbarungsFeld[]> = {
  barkaution: ["zinsmethode", ...KAUTION_KONTO_FELDER],
  sparbuch: ["zinsmethode", ...KAUTION_KONTO_FELDER],
  buergschaft: ["zinsmethode", ...KAUTION_DOKUMENT_FELDER],
  versicherung: ["zinsmethode", ...KAUTION_DOKUMENT_FELDER],
};

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

/** Headings of the inline booking form per booking type (kept here, not in the component file: Fast Refresh). */
export const KAUTION_BUCHUNG_TITEL: Record<KautionBewegungsArt, string> = {
  einzahlung: "Einzahlung erfassen",
  zinsgutschrift: "Zinsgutschrift erfassen",
  auszahlung: "Auszahlung erfassen",
  abzug: "Abzug erfassen",
};

/** Booking types the RPCs accept in the currently shipped phase. Phase 3 adds `zinsgutschrift`. */
export const KAUTION_BEWEGUNGSARTEN_VERFUEGBAR: readonly KautionBewegungsArt[] = ["einzahlung", "zinsgutschrift", "auszahlung", "abzug"];

/** Booking types offered without a usable flag payload (phase 1 default, no interest credit). */
export const KAUTION_BEWEGUNGSARTEN_STANDARD: readonly KautionBewegungsArt[] = ["einzahlung", "auszahlung", "abzug"];

export const KAUTION_ABZUG_KATEGORIEN = ["schaden", "mietrueckstand", "nebenkosten", "sonstiges"] as const satisfies readonly KautionAbzugKategorie[];

export const KAUTION_ABZUG_KATEGORIE_LABELS: Record<KautionAbzugKategorie, string> = {
  schaden: "Schäden",
  mietrueckstand: "Mietrückstand",
  nebenkosten: "Nebenkosten",
  sonstiges: "Sonstiges",
};

// ---------------------------------------------------------------------------
// Instalment plan (phase 2, display only)
// ---------------------------------------------------------------------------

/** Most rates a plan may have (database: rate_nr 1..3). */
export const KAUTION_RATEN_MAX_ANZAHL = 3;

export const KAUTION_RATE_STATUS_LABELS: Record<KautionRateStatus, string> = {
  offen: "Offen",
  teilweise: "Teilweise bezahlt",
  bezahlt: "Bezahlt",
  ueberfaellig: "Überfällig",
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
// Interest (phase 3, display and early validation only, the database calculates)
// ---------------------------------------------------------------------------

/** Day-count methods of a deposit, in the order of the database CHECK list. */
export const KAUTION_ZINSMETHODEN = ["act_365", "act_360", "30_360"] as const satisfies readonly KautionZinsmethode[];

/** Method for new deposits and for deposits without an explicit choice (database default). */
export const KAUTION_ZINSMETHODE_STANDARD: KautionZinsmethode = "act_365";

export const KAUTION_ZINSMETHODE_LABELS: Record<KautionZinsmethode, string> = {
  act_365: "act/365",
  act_360: "act/360",
  "30_360": "30/360",
};

/** Most rows of an interest schedule (`kaution_zinsstaffel_setzen`, database: 0 to 20 rows). */
export const KAUTION_ZINSSTAFFEL_MAX_ZEILEN = 20;

/** Most decimal places of an interest rate in percent (`"1.5"`, `"0.0125"`). More are rejected, never rounded. */
export const KAUTION_ZINSSATZ_MAX_NACHKOMMASTELLEN = 4;

// ---------------------------------------------------------------------------
// Settlement (phase 4, display and early validation only, the database calculates)
// ---------------------------------------------------------------------------

/** Kinds of settlement, in the order of the assistant (interim first). */
export const KAUTION_ABRECHNUNG_ARTEN = ["zwischen", "end"] as const satisfies readonly KautionAbrechnungArt[];

export const KAUTION_ABRECHNUNG_ART_LABELS: Record<KautionAbrechnungArt, string> = {
  zwischen: "Zwischenabrechnung",
  end: "Endabrechnung",
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
  /** Reason of an interest hold (`kaution_einbehalt_setzen`, mandatory when a hold is set). */
  einbehaltGrund: { min: 3, max: 500 },
  interneNotiz: { max: 2000 },
  empfaenger: { max: 200 },
  /** IBAN with spaces removed (the longest IBAN has 34 characters). */
  iban: { max: 34 },
  bank: { max: 200 },
  kontoinhaber: { max: 200 },
  buergeVersicherer: { max: 200 },
  urkundennummer: { max: 100 },
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

export function isKautionZinsmethode(value: unknown): value is KautionZinsmethode {
  return typeof value === "string" && (KAUTION_ZINSMETHODEN as readonly string[]).includes(value);
}

export function isKautionAbrechnungArt(value: unknown): value is KautionAbrechnungArt {
  return typeof value === "string" && (KAUTION_ABRECHNUNG_ARTEN as readonly string[]).includes(value);
}

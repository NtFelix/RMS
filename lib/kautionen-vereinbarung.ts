/**
 * Pure helpers for the agreement fields of a deposit ("Vereinbarung", GH-6, phase 3): bank account (IBAN, bank, account
 * holder, separate account), guarantee/insurance (guarantor or insurer, document number) and the interest method.
 *
 * Shared by the creation form, the agreement form and the overview. Which field belongs to which deposit type is
 * decided by `KAUTION_VEREINBARUNGSFELDER_JE_ART`; the database checks it again (`KA004`).
 *
 * Not a "use server" file (it exports non-async functions and constants).
 */

import {
  KAUTION_TEXT_LIMITS,
  KAUTION_VEREINBARUNGSFELDER_JE_ART,
  KAUTION_ZINSMETHODE_STANDARD,
  type KautionVereinbarungsFeld,
  kautionHatKonto,
} from "@/lib/kautionen-constants";
import { istGueltigeIban, normalisiereIban } from "@/lib/kautionen-iban";
import { validateKautionIban, validateKautionText, validateKautionZinsmethode } from "@/lib/kautionen-validation";
import type { Kaution, KautionArt, KautionZinsmethode } from "@/types/Kaution";

/** Answer to "Getrennt vom eigenen Vermögen angelegt?": yes, no or not recorded (database `NULL`). */
export type GetrenntWahl = "ja" | "nein" | "nicht_erfasst";

export const GETRENNT_WAHL_LABELS: Record<GetrenntWahl, string> = {
  ja: "Ja",
  nein: "Nein",
  nicht_erfasst: "Nicht erfasst",
};

/** Form values of the agreement fields. Texts exactly as typed, the interest method as its database value. */
export interface KautionVereinbarungsWerte {
  iban: string;
  bank: string;
  kontoinhaber: string;
  getrennt: GetrenntWahl;
  buergeVersicherer: string;
  urkundennummer: string;
  zinsmethode: KautionZinsmethode;
}

export type KautionVereinbarungsWertFeld = keyof KautionVereinbarungsWerte;

/** Field errors of the agreement fields (German text per field, only for fields that failed). */
export type KautionVereinbarungsFehler = Partial<Record<KautionVereinbarungsWertFeld, string>>;

/** Empty values of a new deposit (interest method at the database default). */
export function leereVereinbarungsWerte(): KautionVereinbarungsWerte {
  return {
    iban: "",
    bank: "",
    kontoinhaber: "",
    getrennt: "nicht_erfasst",
    buergeVersicherer: "",
    urkundennummer: "",
    zinsmethode: KAUTION_ZINSMETHODE_STANDARD,
  };
}

/** Form values of a stored deposit. The IBAN is shown grouped; comparisons always use the normalised form. */
export function vereinbarungsWerteAusKaution(kaution: Kaution): KautionVereinbarungsWerte {
  return {
    iban: formatiereIban(kaution.iban ?? ""),
    bank: kaution.bank ?? "",
    kontoinhaber: kaution.kontoinhaber ?? "",
    getrennt: wertZuGetrenntWahl(kaution.getrennt_angelegt),
    buergeVersicherer: kaution.buerge_versicherer ?? "",
    urkundennummer: kaution.urkundennummer ?? "",
    zinsmethode: kaution.zinsmethode ?? KAUTION_ZINSMETHODE_STANDARD,
  };
}

/**
 * Display form of an IBAN in blocks of four: `"DE89370400440532013000"` becomes `"DE89 3704 0044 0532 0130 00"`.
 * Only for display and for the input field after leaving it; the stored value is the normalised one.
 */
export function formatiereIban(text: unknown): string {
  return normalisiereIban(text).replace(/(.{4})(?=.)/g, "$1 ");
}

/** Yes/no/not recorded to the database value (`true`, `false`, `null`). */
export function getrenntWahlZuWert(wahl: GetrenntWahl): boolean | null {
  if (wahl === "ja") return true;
  if (wahl === "nein") return false;
  return null;
}

export function wertZuGetrenntWahl(wert: boolean | null | undefined): GetrenntWahl {
  if (wert === true) return "ja";
  if (wert === false) return "nein";
  return "nicht_erfasst";
}

/** Whether a field is shown and sent for the deposit type. */
export function feldFuerArt(art: KautionArt, feld: KautionVereinbarungsFeld): boolean {
  return (KAUTION_VEREINBARUNGSFELDER_JE_ART[art] as readonly string[]).includes(feld);
}

/**
 * Checks the agreement fields that are shown for the type. Fields of other types are not checked (they are sent as empty).
 * The messages never repeat the rejected value.
 */
export function pruefeVereinbarungsWerte(art: KautionArt, werte: KautionVereinbarungsWerte): KautionVereinbarungsFehler {
  const fehler: KautionVereinbarungsFehler = {};

  if (kautionHatKonto(art)) {
    const iban = validateKautionIban(werte.iban);
    if (!iban.ok) fehler.iban = iban.message;
    const bank = validateKautionText(werte.bank, { label: "Die Bank", max: KAUTION_TEXT_LIMITS.bank.max });
    if (!bank.ok) fehler.bank = bank.message;
    const inhaber = validateKautionText(werte.kontoinhaber, { label: "Der Kontoinhaber", max: KAUTION_TEXT_LIMITS.kontoinhaber.max });
    if (!inhaber.ok) fehler.kontoinhaber = inhaber.message;
  } else {
    const buerge = validateKautionText(werte.buergeVersicherer, {
      label: "Der Bürge bzw. Versicherer",
      max: KAUTION_TEXT_LIMITS.buergeVersicherer.max,
    });
    if (!buerge.ok) fehler.buergeVersicherer = buerge.message;
    const urkunde = validateKautionText(werte.urkundennummer, { label: "Die Urkundennummer", max: KAUTION_TEXT_LIMITS.urkundennummer.max });
    if (!urkunde.ok) fehler.urkundennummer = urkunde.message;
  }

  const zinsmethode = validateKautionZinsmethode(werte.zinsmethode);
  if (!zinsmethode.ok) fehler.zinsmethode = zinsmethode.message;

  return fehler;
}

/**
 * Whether the separate-account notice applies: bank account and the separate account is not confirmed (`getrennt_angelegt`
 * is not `true`). Guarantee and insurance have no account and get no notice.
 */
export function getrenntHinweisNoetig(art: KautionArt, getrennt: GetrenntWahl): boolean {
  return kautionHatKonto(art) && getrennt !== "ja";
}

/** Text of the separate-account notice (neutral wording, no legal advice). */
export const GETRENNT_HINWEIS_TEXT = "Die Kaution ist getrennt vom eigenen Vermögen und verzinslich anzulegen (§ 551 BGB).";

/** Whether an IBAN text is valid, for the live hint while typing (never blocks). Empty counts as "not given". */
export function istIbanEingabeUngueltig(text: string): boolean {
  const iban = normalisiereIban(text);
  return iban !== "" && !istGueltigeIban(iban);
}

/** Agreement fields of a new deposit as the create action takes them (camelCase, only the given ones). */
export interface AnlegenVereinbarungsFelder {
  iban?: string;
  bank?: string;
  kontoinhaber?: string;
  getrenntAngelegt?: boolean;
  buergeVersicherer?: string;
  urkundennummer?: string;
  zinsmethode?: KautionZinsmethode;
}

/**
 * Agreement fields of a NEW deposit for the create action. Only what is given is returned: empty texts, "not recorded"
 * and fields of other types are left out (the database keeps its defaults). The interest method is only sent when the
 * interest function is on.
 */
export function anlegenVereinbarungsFelder(art: KautionArt, werte: KautionVereinbarungsWerte, zinsenAktiv: boolean): AnlegenVereinbarungsFelder {
  const felder: AnlegenVereinbarungsFelder = {};
  if (kautionHatKonto(art)) {
    const iban = normalisiereIban(werte.iban);
    if (iban !== "") felder.iban = iban;
    if (werte.bank.trim() !== "") felder.bank = werte.bank;
    if (werte.kontoinhaber.trim() !== "") felder.kontoinhaber = werte.kontoinhaber;
    const getrennt = getrenntWahlZuWert(werte.getrennt);
    if (getrennt !== null) felder.getrenntAngelegt = getrennt;
    if (zinsenAktiv) felder.zinsmethode = werte.zinsmethode;
  } else {
    if (werte.buergeVersicherer.trim() !== "") felder.buergeVersicherer = werte.buergeVersicherer;
    if (werte.urkundennummer.trim() !== "") felder.urkundennummer = werte.urkundennummer;
  }
  return felder;
}

/**
 * Changed agreement fields for `kaution_aendern` (database keys). Only what differs from the stored deposit is sent.
 *
 * Changing the deposit type clears the fields of the old type: a field that the new type does not allow is sent as
 * `null` whenever the stored deposit holds a value there (otherwise the database rejects the change with `KA004`).
 * The interest method is allowed for every type and is only sent when it changed. An empty text clears the field.
 */
export function vereinbarungsAenderungen(
  kaution: Kaution,
  neueArt: KautionArt,
  werte: KautionVereinbarungsWerte
): Record<string, string | boolean | null> {
  const felder: Record<string, string | boolean | null> = {};
  if (neueArt !== kaution.kautionsart) felder.kautionsart = neueArt;

  const textFeld = (feld: "iban" | "bank" | "kontoinhaber" | "buerge_versicherer" | "urkundennummer", eingabe: string, gespeichert: string | null | undefined) => {
    const neu = feldFuerArt(neueArt, feld) ? eingabe.trim() : "";
    const vergleichNeu = feld === "iban" ? normalisiereIban(neu) : neu;
    const vergleichAlt = feld === "iban" ? normalisiereIban(gespeichert ?? "") : (gespeichert ?? "").trim();
    if (vergleichNeu !== vergleichAlt) {
      felder[feld] = feld === "iban" ? (vergleichNeu === "" ? null : vergleichNeu) : (neu === "" ? null : neu);
    }
  };

  textFeld("iban", werte.iban, kaution.iban);
  textFeld("bank", werte.bank, kaution.bank);
  textFeld("kontoinhaber", werte.kontoinhaber, kaution.kontoinhaber);
  textFeld("buerge_versicherer", werte.buergeVersicherer, kaution.buerge_versicherer);
  textFeld("urkundennummer", werte.urkundennummer, kaution.urkundennummer);

  const getrenntNeu = feldFuerArt(neueArt, "getrennt_angelegt") ? getrenntWahlZuWert(werte.getrennt) : null;
  if (getrenntNeu !== (kaution.getrennt_angelegt ?? null)) felder.getrennt_angelegt = getrenntNeu;

  if (werte.zinsmethode !== (kaution.zinsmethode ?? KAUTION_ZINSMETHODE_STANDARD)) felder.zinsmethode = werte.zinsmethode;

  return felder;
}

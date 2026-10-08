import type { KautionLoeschauswirkung, KautionLoeschKautionen } from "@/types/Kaution";

/** Number of deposits with bookings the database lists at most (see `get_kautionen_loeschauswirkung`). */
const MAX_LISTE = 100;

/** Adds amounts exactly to the cent (the figures come from the database with two decimals). */
function summeBetraege(...betraege: number[]): number {
  return betraege.reduce((summe, betrag) => summe + Math.round(betrag * 100), 0) / 100;
}

function mergeKautionen(teile: KautionLoeschKautionen[]): KautionLoeschKautionen {
  const liste = teile.flatMap((teil) => teil.mit_buchungen_liste);
  return {
    anzahl: teile.reduce((summe, teil) => summe + teil.anzahl, 0),
    ohne_buchungen: teile.reduce((summe, teil) => summe + teil.ohne_buchungen, 0),
    mit_buchungen: teile.reduce((summe, teil) => summe + teil.mit_buchungen, 0),
    konto_noch_offen: summeBetraege(...teile.map((teil) => teil.konto_noch_offen)),
    konto_verwahrt: summeBetraege(...teile.map((teil) => teil.konto_verwahrt)),
    dokumentiert_anzahl: teile.reduce((summe, teil) => summe + teil.dokumentiert_anzahl, 0),
    dokumentiert_summe: summeBetraege(...teile.map((teil) => teil.dokumentiert_summe)),
    mit_saldo_anzahl: teile.reduce((summe, teil) => summe + teil.mit_saldo_anzahl, 0),
    mit_buchungen_gekuerzt: teile.some((teil) => teil.mit_buchungen_gekuerzt) || liste.length > MAX_LISTE,
    mit_buchungen_liste: liste.slice(0, MAX_LISTE),
  };
}

/**
 * Combines the impact of several requests (one per chunk of at most 200 IDs, the limit of the database function) to one
 * overview. Runs on the server: the browser never adds amounts. The chunks hold different IDs, so the counts of
 * houses, apartments and tenants do not overlap. `pruefsumme` of the whole is `null` (each entry carries its own
 * checksum, that is what the confirmed deletion needs). A single part is returned unchanged.
 */
export function mergeLoeschauswirkung(teile: KautionLoeschauswirkung[]): KautionLoeschauswirkung {
  if (teile.length === 1) return teile[0];
  const sichtbar = teile.every((teil) => teil.kautionen_sichtbar);
  const kautionen = sichtbar ? teile.map((teil) => teil.kautionen).filter((teil): teil is KautionLoeschKautionen => teil !== null) : [];
  return {
    tabelle: teile[0].tabelle,
    anzahl_haeuser: teile.reduce((summe, teil) => summe + teil.anzahl_haeuser, 0),
    anzahl_wohnungen: teile.reduce((summe, teil) => summe + teil.anzahl_wohnungen, 0),
    anzahl_mieter: teile.reduce((summe, teil) => summe + teil.anzahl_mieter, 0),
    kautionen_sichtbar: sichtbar,
    kautionen: sichtbar && kautionen.length === teile.length ? mergeKautionen(kautionen) : null,
    pruefsumme: null,
    eintraege: teile.flatMap((teil) => teil.eintraege),
  };
}

/** Splits the IDs into chunks for the database function. */
export function chunkIds(ids: string[], groesse: number): string[][] {
  const teile: string[][] = [];
  for (let start = 0; start < ids.length; start += groesse) teile.push(ids.slice(start, start + groesse));
  return teile;
}

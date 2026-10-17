/**
 * Tests of the agreement helpers (GH-6, phase 3): validation per deposit type, the create payload and the change set of
 * an agreement, including the clearing of the fields of an old type after a type change (database rule KA004).
 * The IBAN is the public example from the specification; all other values are synthetic.
 */

import {
  anlegenVereinbarungsFelder,
  feldFuerArt,
  formatiereIban,
  getrenntHinweisNoetig,
  leereVereinbarungsWerte,
  pruefeVereinbarungsWerte,
  vereinbarungsAenderungen,
  vereinbarungsWerteAusKaution,
  wertZuGetrenntWahl,
  type KautionVereinbarungsWerte,
} from "@/lib/kautionen-vereinbarung";
import type { Kaution } from "@/types/Kaution";

const IBAN_BEISPIEL = "DE89370400440532013000";

function kautionMit(aenderung: Partial<Kaution> = {}): Kaution {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    organisation_id: "44444444-4444-4444-8444-444444444444",
    mieter_id: "11111111-1111-4111-8111-111111111111",
    kautionsart: "barkaution",
    soll_betrag: 1500,
    miete_bei_vertragsschluss: 500,
    interne_notiz: null,
    quelle: "app",
    erstellt_am: "2026-01-05T09:00:00Z",
    geaendert_am: "2026-01-05T09:00:00Z",
    iban: IBAN_BEISPIEL,
    bank: "Beispielbank (Testdaten)",
    kontoinhaber: "Max Muster (Testdaten)",
    getrennt_angelegt: true,
    zinsmethode: "act_365",
    ...aenderung,
  };
}

function werte(teil: Partial<KautionVereinbarungsWerte> = {}): KautionVereinbarungsWerte {
  return { ...leereVereinbarungsWerte(), ...teil };
}

describe("feldFuerArt", () => {
  it("ordnet die Kontofelder dem Bankkonto zu und die Dokumentfelder der Bürgschaft", () => {
    expect(feldFuerArt("barkaution", "iban")).toBe(true);
    expect(feldFuerArt("sparbuch", "getrennt_angelegt")).toBe(true);
    expect(feldFuerArt("buergschaft", "iban")).toBe(false);
    expect(feldFuerArt("versicherung", "urkundennummer")).toBe(true);
  });

  it("erlaubt die Zinsmethode für jede Art", () => {
    expect(feldFuerArt("versicherung", "zinsmethode")).toBe(true);
  });
});

describe("pruefeVereinbarungsWerte", () => {
  it("akzeptiert eine gültige IBAN mit Leerzeichen", () => {
    expect(pruefeVereinbarungsWerte("barkaution", werte({ iban: "DE89 3704 0044 0532 0130 00" }))).toEqual({});
  });

  it("meldet eine ungültige IBAN ohne den eingegebenen Wert zu wiederholen", () => {
    const fehler = pruefeVereinbarungsWerte("sparbuch", werte({ iban: "DE00 0000 0000 0000 0000 00" }));
    expect(fehler.iban).toBe("Bitte geben Sie eine gültige IBAN an.");
    expect(fehler.iban).not.toContain("DE00");
  });

  it("prüft bei einer Bürgschaft keine Kontofelder", () => {
    expect(pruefeVereinbarungsWerte("buergschaft", werte({ iban: "XX" }))).toEqual({});
  });

  it("prüft bei einer Bürgschaft die Länge des Bürgen", () => {
    expect(pruefeVereinbarungsWerte("buergschaft", werte({ buergeVersicherer: "x".repeat(201) })).buergeVersicherer).toMatch(/höchstens/);
  });
});

describe("getrenntHinweisNoetig und wertZuGetrenntWahl", () => {
  it("zeigt den Hinweis nur für Kontoarten ohne bestätigte Trennung", () => {
    expect(getrenntHinweisNoetig("barkaution", "nicht_erfasst")).toBe(true);
    expect(getrenntHinweisNoetig("sparbuch", "nein")).toBe(true);
    expect(getrenntHinweisNoetig("sparbuch", "ja")).toBe(false);
    expect(getrenntHinweisNoetig("buergschaft", "nicht_erfasst")).toBe(false);
  });

  it("bildet Ja, Nein und nicht erfasst auf den Datenbankwert ab", () => {
    expect(wertZuGetrenntWahl(true)).toBe("ja");
    expect(wertZuGetrenntWahl(false)).toBe("nein");
    expect(wertZuGetrenntWahl(null)).toBe("nicht_erfasst");
    expect(wertZuGetrenntWahl(undefined)).toBe("nicht_erfasst");
  });
});

describe("anlegenVereinbarungsFelder", () => {
  it("sendet bei einer Kontoart nur die ausgefüllten Kontofelder", () => {
    expect(
      anlegenVereinbarungsFelder("barkaution", werte({ iban: IBAN_BEISPIEL, getrennt: "ja", bank: "", buergeVersicherer: "Nicht senden" }), false)
    ).toEqual({ iban: IBAN_BEISPIEL, getrenntAngelegt: true });
  });

  it("lässt die Zinsmethode weg, solange die Zinsfunktion aus ist", () => {
    expect(anlegenVereinbarungsFelder("sparbuch", werte(), false)).not.toHaveProperty("zinsmethode");
    expect(anlegenVereinbarungsFelder("sparbuch", werte({ zinsmethode: "30_360" }), true)).toEqual({ zinsmethode: "30_360" });
  });

  it("sendet bei Bürgschaft und Versicherung nur Bürge und Urkundennummer", () => {
    expect(
      anlegenVereinbarungsFelder("versicherung", werte({ buergeVersicherer: "Beispiel Versicherung (Testdaten)", urkundennummer: "P-0001" }), true)
    ).toEqual({ buergeVersicherer: "Beispiel Versicherung (Testdaten)", urkundennummer: "P-0001" });
  });
});

describe("vereinbarungsWerteAusKaution", () => {
  it("zeigt die IBAN gruppiert und übernimmt den gespeicherten Wert", () => {
    const formwerte = vereinbarungsWerteAusKaution(kautionMit());
    expect(formwerte.iban).toBe("DE89 3704 0044 0532 0130 00");
    expect(formwerte.getrennt).toBe("ja");
    expect(formwerte.zinsmethode).toBe("act_365");
  });

  it("setzt die Zinsmethode auf den Datenbankstandard, wenn keine gespeichert ist", () => {
    expect(vereinbarungsWerteAusKaution(kautionMit({ zinsmethode: undefined })).zinsmethode).toBe("act_365");
  });
});

describe("vereinbarungsAenderungen", () => {
  it("sendet nichts, wenn die Werte den gespeicherten entsprechen", () => {
    const kaution = kautionMit();
    expect(vereinbarungsAenderungen(kaution, "barkaution", vereinbarungsWerteAusKaution(kaution))).toEqual({});
  });

  it("vergleicht die IBAN normalisiert (Leerzeichen und Schreibweise ändern nichts)", () => {
    const kaution = kautionMit();
    const eingabe = werte({ ...vereinbarungsWerteAusKaution(kaution), iban: "de89 3704 0044 0532 0130 00" });
    expect(vereinbarungsAenderungen(kaution, "barkaution", eingabe)).toEqual({});
  });

  it("sendet nur den geänderten Wert, leere Texte als null", () => {
    const kaution = kautionMit();
    const eingabe = { ...vereinbarungsWerteAusKaution(kaution), bank: "", getrennt: "nein" as const };
    expect(vereinbarungsAenderungen(kaution, "barkaution", eingabe)).toEqual({ bank: null, getrennt_angelegt: false });
  });

  it("leert beim Wechsel zur Bürgschaft die Kontofelder mit null und sendet die neue Art", () => {
    const kaution = kautionMit();
    const eingabe = {
      ...vereinbarungsWerteAusKaution(kaution),
      buergeVersicherer: "Beispiel Bürge (Testdaten)",
      urkundennummer: "B-0001",
    };
    expect(vereinbarungsAenderungen(kaution, "buergschaft", eingabe)).toEqual({
      kautionsart: "buergschaft",
      iban: null,
      bank: null,
      kontoinhaber: null,
      getrennt_angelegt: null,
      buerge_versicherer: "Beispiel Bürge (Testdaten)",
      urkundennummer: "B-0001",
    });
  });

  it("sendet beim Wechsel ohne gespeicherte Kontodaten keine Null-Werte für Konto-Felder", () => {
    const kaution = kautionMit({ iban: null, bank: null, kontoinhaber: null, getrennt_angelegt: null });
    const eingabe = { ...vereinbarungsWerteAusKaution(kaution), buergeVersicherer: "Beispiel Bürge (Testdaten)" };
    expect(vereinbarungsAenderungen(kaution, "buergschaft", eingabe)).toEqual({
      kautionsart: "buergschaft",
      buerge_versicherer: "Beispiel Bürge (Testdaten)",
    });
  });

  it("sendet die Zinsmethode nur bei einer Änderung", () => {
    const kaution = kautionMit();
    expect(vereinbarungsAenderungen(kaution, "barkaution", werte({ ...vereinbarungsWerteAusKaution(kaution), zinsmethode: "act_360" }))).toEqual({
      zinsmethode: "act_360",
    });
  });
});

describe("formatiereIban", () => {
  it("gruppiert eine IBAN in Vierer-Blöcke", () => {
    expect(formatiereIban("DE89370400440532013000")).toBe("DE89 3704 0044 0532 0130 00");
  });

  it("normalisiert Leerzeichen und Groß-/Kleinschreibung vor der Gruppierung", () => {
    expect(formatiereIban(" de89 3704 0044 0532 0130 00 ")).toBe("DE89 3704 0044 0532 0130 00");
  });

  it("liefert für fehlende Werte einen leeren Text", () => {
    expect(formatiereIban("")).toBe("");
    expect(formatiereIban(undefined)).toBe("");
  });
});

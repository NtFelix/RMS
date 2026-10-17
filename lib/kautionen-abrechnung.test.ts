/**
 * Tests for the settlement helpers (phase 4). All values are synthetic placeholders.
 */

import {
  KAUTION_ABRECHNUNG_MAX_ANFRAGE_BYTES,
  abrechnungFehlerStatus,
  baueAbrechnungWorkerNutzlast,
  baueKautionAbrechnungDateiname,
  istAbrechnungAnfrageZuGross,
  istPdfBytes,
  parseAbrechnungAnfrage,
  pruefeAbrechnungAnfrageKopf,
} from "@/lib/kautionen-abrechnung";
import type { KautionAbrechnung } from "@/types/Kaution";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";

/** Synthetic settlement as the database returns it (`get_kaution_abrechnung`). */
const ABRECHNUNG: KautionAbrechnung = {
  regelwerk_version: 1,
  stichtag: "2026-03-15",
  organisation: { name: "Muster Verwaltung" },
  mieter: { name: "Muster Mieter", auszug: "2026-02-28" },
  objekt: { haus: "Musterhaus", wohnung: "Whg 1" },
  kaution: { kautionsart: "barkaution", soll_betrag: 1000, zinsmethode: "act_365", getrennt_angelegt: true },
  konto: { summe_einzahlungen: 1000, summe_zinsgutschriften: 10, summe_auszahlungen: 500, summe_abzuege: 100, kontostand: 410 },
  abzuege: [{ kategorie: "nebenkosten", anzahl: 1, summe: 100 }],
  zinsen_offen: null,
  betrag_inkl_zinsen: 410,
  einbehalt: { grund: "Nebenkostenabrechnung offen", seit: "2026-03-01", liegedauer_tage: 14 },
  bewegungen: [
    {
      wertstellung: "2025-09-01",
      bewegungsart: "einzahlung",
      betrag: 1000,
      kategorie: null,
      grund: null,
      zinszeitraum_von: null,
      zinszeitraum_bis: null,
      saldo_nach_buchung: 1000,
    },
  ],
  storniert_anzahl: 0,
};

describe("parseAbrechnungAnfrage", () => {
  it("accepts the three fields and returns them checked", () => {
    expect(parseAbrechnungAnfrage({ tenantId: TENANT_ID, art: "zwischen", stichtag: "2026-03-15" })).toEqual({
      ok: true,
      value: { tenantId: TENANT_ID, art: "zwischen", stichtag: "2026-03-15" },
    });
    expect(parseAbrechnungAnfrage({ tenantId: TENANT_ID, art: "end" })).toEqual({
      ok: true,
      value: { tenantId: TENANT_ID, art: "end", stichtag: null },
    });
  });

  it("drops every other field of the body (figures, file name, user ID must never be taken over)", () => {
    const result = parseAbrechnungAnfrage({
      tenantId: TENANT_ID,
      art: "end",
      data: { konto: { kontostand: 999999 } },
      filename: "../../etwas.pdf",
      user_id: "77777777-7777-4777-8777-777777777777",
      interneNotiz: "Muster-Notiz",
    });
    expect(result).toEqual({ ok: true, value: { tenantId: TENANT_ID, art: "end", stichtag: null } });
  });

  it.each([
    ["no object", null],
    ["an array", [TENANT_ID]],
    ["a string", "Muster"],
  ])("rejects %s as body", (_label, body) => {
    expect(parseAbrechnungAnfrage(body).ok).toBe(false);
  });

  it("rejects an invalid tenant ID", () => {
    expect(parseAbrechnungAnfrage({ tenantId: "keine-id", art: "end" })).toEqual({ ok: false, message: "Ungültige Mieter-ID." });
    expect(parseAbrechnungAnfrage({ art: "end" }).ok).toBe(false);
  });

  it("rejects a kind outside the enumeration", () => {
    for (const art of ["Zwischen", "final", "", 1, null]) {
      expect(parseAbrechnungAnfrage({ tenantId: TENANT_ID, art }).ok).toBe(false);
    }
  });

  it("rejects an invalid settlement date and accepts a missing one", () => {
    expect(parseAbrechnungAnfrage({ tenantId: TENANT_ID, art: "end", stichtag: "2026-02-30" }).ok).toBe(false);
    expect(parseAbrechnungAnfrage({ tenantId: TENANT_ID, art: "end", stichtag: "15.03.2026" }).ok).toBe(false);
    expect(parseAbrechnungAnfrage({ tenantId: TENANT_ID, art: "end", stichtag: null })).toEqual({
      ok: true,
      value: { tenantId: TENANT_ID, art: "end", stichtag: null },
    });
  });
});

describe("baueKautionAbrechnungDateiname", () => {
  it("builds the file name from fixed parts: Kautionsabrechnung-<Zwischen|End>-<Stichtag>.pdf", () => {
    expect(baueKautionAbrechnungDateiname("zwischen", "2026-03-15")).toBe("Kautionsabrechnung-Zwischen-2026-03-15.pdf");
    expect(baueKautionAbrechnungDateiname("end", "2026-03-15")).toBe("Kautionsabrechnung-End-2026-03-15.pdf");
  });

  it("returns null for an unknown kind or an invalid date (no fallback name from user input)", () => {
    expect(baueKautionAbrechnungDateiname("final", "2026-03-15")).toBeNull();
    expect(baueKautionAbrechnungDateiname(undefined, "2026-03-15")).toBeNull();
    expect(baueKautionAbrechnungDateiname("end", "2026-02-31")).toBeNull();
    expect(baueKautionAbrechnungDateiname("end", "../../etwas")).toBeNull();
  });
});

describe("pruefeAbrechnungAnfrageKopf (request form, cross-site)", () => {
  it("accepts JSON, with or without charset, from the same origin or without browser metadata", () => {
    expect(pruefeAbrechnungAnfrageKopf("application/json", "same-origin")).toEqual({ ok: true });
    expect(pruefeAbrechnungAnfrageKopf("Application/JSON; charset=utf-8", "none")).toEqual({ ok: true });
    expect(pruefeAbrechnungAnfrageKopf("application/json", null)).toEqual({ ok: true });
  });

  it("refuses every other content type with 415 (a plain form cannot send JSON)", () => {
    for (const contentType of [null, "", "text/plain", "application/x-www-form-urlencoded", "multipart/form-data; boundary=x"]) {
      const result = pruefeAbrechnungAnfrageKopf(contentType, null);
      expect(result).toEqual({ ok: false, status: 415, message: "Die Anfrage muss als JSON gesendet werden." });
    }
  });

  it("refuses requests the browser marks as cross-site or same-site with 403", () => {
    expect(pruefeAbrechnungAnfrageKopf("application/json", "cross-site")).toEqual({
      ok: false,
      status: 403,
      message: "Die Anfrage wurde abgelehnt.",
    });
    expect(pruefeAbrechnungAnfrageKopf("application/json", "same-site").ok).toBe(false);
  });
});

describe("istAbrechnungAnfrageZuGross", () => {
  it("compares the declared length with the body limit", () => {
    expect(istAbrechnungAnfrageZuGross(null)).toBe(false);
    expect(istAbrechnungAnfrageZuGross("")).toBe(false);
    expect(istAbrechnungAnfrageZuGross(String(KAUTION_ABRECHNUNG_MAX_ANFRAGE_BYTES))).toBe(false);
    expect(istAbrechnungAnfrageZuGross(String(KAUTION_ABRECHNUNG_MAX_ANFRAGE_BYTES + 1))).toBe(true);
    expect(istAbrechnungAnfrageZuGross("abc")).toBe(false);
  });
});

describe("abrechnungFehlerStatus", () => {
  it("maps the codes of the settlement read action to HTTP statuses", () => {
    expect(abrechnungFehlerStatus("KA001")).toBe(401);
    expect(abrechnungFehlerStatus("42501")).toBe(403);
    expect(abrechnungFehlerStatus("KA004")).toBe(400);
    expect(abrechnungFehlerStatus("KA013")).toBe(400);
  });

  it("answers not visible, not found and no account alike with 404", () => {
    expect(abrechnungFehlerStatus("KA002")).toBe(404);
    expect(abrechnungFehlerStatus("KA003")).toBe(404);
    expect(abrechnungFehlerStatus("KA014")).toBe(404);
  });

  it("treats unknown and missing codes as server errors", () => {
    expect(abrechnungFehlerStatus("XX000")).toBe(500);
    expect(abrechnungFehlerStatus(undefined)).toBe(500);
  });
});

describe("baueAbrechnungWorkerNutzlast", () => {
  it("sends the worker the template, the file name and the database figures with the checked kind", () => {
    const nutzlast = baueAbrechnungWorkerNutzlast("end", "Kautionsabrechnung-End-2026-03-15.pdf", ABRECHNUNG);

    expect(nutzlast.type).toBe("pdf");
    expect(nutzlast.template).toBe("kaution-abrechnung");
    expect(nutzlast.filename).toBe("Kautionsabrechnung-End-2026-03-15.pdf");
    expect(nutzlast.data).toEqual({ ...ABRECHNUNG, art: "end" });
    expect(Object.keys(nutzlast).sort()).toEqual(["data", "filename", "template", "type"]);
  });

  it("writes the checked kind last, so a field of the same name in the figures cannot change it", () => {
    const manipuliert = { ...ABRECHNUNG, art: "zwischen" } as unknown as KautionAbrechnung;
    const nutzlast = baueAbrechnungWorkerNutzlast("end", "x.pdf", manipuliert);
    expect(nutzlast.data.art).toBe("end");
  });
});

describe("istPdfBytes", () => {
  it("accepts the PDF signature and rejects anything else", () => {
    expect(istPdfBytes(new TextEncoder().encode("%PDF-1.7\n%muster"))).toBe(true);
    expect(istPdfBytes(new TextEncoder().encode("<html>"))).toBe(false);
    expect(istPdfBytes(new TextEncoder().encode("%PD"))).toBe(false);
    expect(istPdfBytes(new Uint8Array(0))).toBe(false);
  });
});

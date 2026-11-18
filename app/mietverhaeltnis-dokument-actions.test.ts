/** @jest-environment node */

/**
 * Tests for the contract document actions (GH-17, phase 4). `jest.setup.js` mocks `@/lib/permissions` (always
 * `true`) and `@/lib/auth-utils` globally; the negative cases override them. All IDs and names are synthetic.
 */

import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { getAccessibleWohnungIds } from "@/lib/object-scope";
import { createSignedUrls } from "@/lib/storage-operations";
import {
  getVertragsdokumentAction,
  listeVertragsdokumentKandidatenAction,
  vertragsdokumentOeffnenAction,
  vertragsdokumentSetzenAction,
} from "@/app/mietverhaeltnis-dokument-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/logging-middleware", () => ({ logAction: jest.fn() }));
jest.mock("@/lib/storage-operations", () => ({ createSignedUrls: jest.fn() }));

const MIETER_ID = "11111111-1111-4111-8111-111111111111";
const MV_ID = "22222222-2222-4222-8222-222222222222";
const DOK_ID = "33333333-3333-4333-8333-333333333333";
const WOHNUNG_ID = "66666666-6666-4666-8666-666666666666";
const HAUS_ID = "77777777-7777-4777-8777-777777777777";
const ORG_ID = "88888888-8888-4888-8888-888888888888";
const HAUS_ORDNER = `org_${ORG_ID}/shared/${HAUS_ID}`;

const mockHasPermission = hasPermission as jest.Mock;
const mockWohnungIds = getAccessibleWohnungIds as jest.Mock;
const mockEnsureAuth = ensureAuth as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;
const mockSignedUrls = createSignedUrls as jest.Mock;

type Antwort = { data: unknown; error: unknown };

let mieterZeile: Antwort;
let mvZeile: Antwort;
let dokumentZeile: Antwort;
let dokumentListe: Antwort;
let updateErgebnis: Antwort;
let orgAntwort: Antwort;

const mockUpdate = jest.fn();
const mockUpdateFilter = jest.fn();
const mockOr = jest.fn();
const mockFrom = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mieterZeile = {
    data: { id: MIETER_ID, mietverhaeltnis_id: MV_ID, wohnung_id: WOHNUNG_ID, Wohnungen: { haus_id: HAUS_ID } },
    error: null,
  };
  mvZeile = { data: { id: MV_ID, vertrag_dokument_id: DOK_ID }, error: null };
  dokumentZeile = { data: { id: DOK_ID, dateiname: "vertrag.pdf", dateipfad: `${HAUS_ORDNER}/Vertraege` }, error: null };
  dokumentListe = { data: [], error: null };
  updateErgebnis = { data: [{ id: MV_ID }], error: null };
  orgAntwort = { data: ORG_ID, error: null };

  mockFrom.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () =>
          table === "Mieter" ? mieterZeile : table === "Mieter_Mietverhaeltnisse" ? mvZeile : table === "Dokumente_Metadaten" ? dokumentZeile : { data: null, error: null },
      }),
      or: (filter: string) => {
        mockOr(filter);
        return { order: () => ({ limit: async () => dokumentListe }) };
      },
    }),
    update: (werte: unknown) => {
      mockUpdate(table, werte);
      return {
        eq: (spalte: string, wert: unknown) => {
          mockUpdateFilter(spalte, wert);
          return { select: async () => updateErgebnis };
        },
      };
    },
  }));
  mockEnsureAuth.mockResolvedValue({ user: { id: "user-1" }, supabase: { from: mockFrom, rpc: async () => orgAntwort } });
  mockHasPermission.mockResolvedValue(true);
  mockWohnungIds.mockResolvedValue(null);
  mockSignedUrls.mockResolvedValue([{ path: "x", url: "https://example.test/signed" }]);
});

describe("getVertragsdokumentAction", () => {
  it("returns the linked document with its folder below the house folder", async () => {
    const result = await getVertragsdokumentAction(MIETER_ID);
    expect(result).toEqual({ success: true, data: { id: DOK_ID, name: "vertrag.pdf", ordner: "Vertraege" } });
  });

  it("returns null without a link", async () => {
    mvZeile = { data: { id: MV_ID, vertrag_dokument_id: null }, error: null };
    expect(await getVertragsdokumentAction(MIETER_ID)).toEqual({ success: true, data: null });
  });

  it("returns null (not an error) when the linked document is not visible", async () => {
    dokumentZeile = { data: null, error: null };
    expect(await getVertragsdokumentAction(MIETER_ID)).toEqual({ success: true, data: null });
  });

  it("returns null when the document lies outside the house folder", async () => {
    dokumentZeile = { data: { id: DOK_ID, dateiname: "a.pdf", dateipfad: `org_${ORG_ID}/shared/andere-haus` }, error: null };
    expect(await getVertragsdokumentAction(MIETER_ID)).toEqual({ success: true, data: null });
  });

  it("rejects an invalid ID with MV004", async () => {
    expect(await getVertragsdokumentAction("x")).toMatchObject({ success: false, error: { code: "MV004" } });
  });

  it("rejects a tenant outside the object scope with 42501", async () => {
    mockWohnungIds.mockResolvedValue(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
    expect(await getVertragsdokumentAction(MIETER_ID)).toMatchObject({ success: false, error: { code: "42501" } });
  });

  it("reports MV003 for a tenant without tenancy", async () => {
    mieterZeile = { data: { ...(mieterZeile.data as object), mietverhaeltnis_id: null }, error: null };
    expect(await getVertragsdokumentAction(MIETER_ID)).toMatchObject({ success: false, error: { code: "MV003" } });
  });
});

describe("listeVertragsdokumentKandidatenAction", () => {
  it("lists only documents of the house folder that may be contract documents", async () => {
    dokumentListe = {
      data: [
        { id: DOK_ID, dateiname: "vertrag.pdf", dateipfad: HAUS_ORDNER },
        { id: "44444444-4444-4444-8444-444444444444", dateiname: "scan.pdf", dateipfad: `${HAUS_ORDNER}/Mieter/Test` },
        { id: "55555555-5555-4555-8555-555555555555", dateiname: "beleg.pdf", dateipfad: `${HAUS_ORDNER}/Kautionen/abc` },
        { id: "55555555-5555-4555-8555-555555555556", dateiname: "alt.pdf", dateipfad: `${HAUS_ORDNER}/__archive__/2026` },
        { id: "55555555-5555-4555-8555-555555555557", dateiname: ".keep", dateipfad: HAUS_ORDNER },
        { id: "55555555-5555-4555-8555-555555555558", dateiname: "fremd.pdf", dateipfad: `org_${ORG_ID}/shared/${HAUS_ID}2` },
      ],
      error: null,
    };
    const result = await listeVertragsdokumentKandidatenAction(MIETER_ID);
    expect(result).toEqual({
      success: true,
      data: [
        { id: DOK_ID, name: "vertrag.pdf", ordner: "" },
        { id: "44444444-4444-4444-8444-444444444444", name: "scan.pdf", ordner: "Mieter/Test" },
      ],
    });
    expect(mockOr).toHaveBeenCalledWith(expect.stringContaining(HAUS_ORDNER));
  });

  it("maps a database error", async () => {
    dokumentListe = { data: null, error: { code: "42501", message: "x" } };
    expect(await listeVertragsdokumentKandidatenAction(MIETER_ID)).toMatchObject({ success: false, error: { code: "42501" } });
  });

  it("needs the module right", async () => {
    mockHasPermission.mockResolvedValue(false);
    expect(await listeVertragsdokumentKandidatenAction(MIETER_ID)).toMatchObject({ success: false, error: { code: "42501" } });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("vertragsdokumentSetzenAction", () => {
  it("links a document of the house folder to the tenancy of the tenant", async () => {
    const result = await vertragsdokumentSetzenAction({ mieterId: MIETER_ID, dokumentId: DOK_ID });
    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdate).toHaveBeenCalledWith("Mieter_Mietverhaeltnisse", { vertrag_dokument_id: DOK_ID });
    expect(mockUpdateFilter).toHaveBeenCalledWith("id", MV_ID);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
  });

  it("removes the link with null (no document lookup)", async () => {
    const result = await vertragsdokumentSetzenAction({ mieterId: MIETER_ID, dokumentId: null });
    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdate).toHaveBeenCalledWith("Mieter_Mietverhaeltnisse", { vertrag_dokument_id: null });
    expect(mockFrom).not.toHaveBeenCalledWith("Dokumente_Metadaten");
  });

  it.each([
    ["invalid tenant ID", { mieterId: "x", dokumentId: DOK_ID }],
    ["invalid document ID", { mieterId: MIETER_ID, dokumentId: "x" }],
    ["missing document key", { mieterId: MIETER_ID }],
  ])("rejects %s with MV004 before any database call", async (_name, eingabe) => {
    const result = await vertragsdokumentSetzenAction(eingabe as never);
    expect(result).toMatchObject({ success: false, error: { code: "MV004" } });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it.each([
    ["not visible", { data: null, error: null }],
    ["in another house folder", { data: { id: DOK_ID, dateiname: "a.pdf", dateipfad: `org_${ORG_ID}/shared/anderes` }, error: null }],
    ["a deposit receipt", { data: { id: DOK_ID, dateiname: "a.pdf", dateipfad: `${HAUS_ORDNER}/Kautionen/x` }, error: null }],
    ["archived", { data: { id: DOK_ID, dateiname: "a.pdf", dateipfad: `${HAUS_ORDNER}/__archive__/x` }, error: null }],
  ])("rejects a document that is %s with MV011 and does not write", async (_name, antwort) => {
    dokumentZeile = antwort;
    const result = await vertragsdokumentSetzenAction({ mieterId: MIETER_ID, dokumentId: DOK_ID });
    expect(result).toMatchObject({ success: false, error: { code: "MV011" } });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("needs the rights view and edit", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "bearbeiten");
    expect(await vertragsdokumentSetzenAction({ mieterId: MIETER_ID, dokumentId: DOK_ID })).toMatchObject({ success: false, error: { code: "42501" } });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("reports 42501 when row level security returns no row, and MV011 from the database trigger", async () => {
    updateErgebnis = { data: [], error: null };
    expect(await vertragsdokumentSetzenAction({ mieterId: MIETER_ID, dokumentId: DOK_ID })).toMatchObject({ success: false, error: { code: "42501" } });
    updateErgebnis = { data: null, error: { code: "MV011", message: "x" } };
    expect(await vertragsdokumentSetzenAction({ mieterId: MIETER_ID, dokumentId: DOK_ID })).toMatchObject({ success: false, error: { code: "MV011" } });
  });

  it("does not revalidate after a failure", async () => {
    updateErgebnis = { data: null, error: { code: "MV011", message: "x" } };
    await vertragsdokumentSetzenAction({ mieterId: MIETER_ID, dokumentId: DOK_ID });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("vertragsdokumentOeffnenAction", () => {
  it("returns a short-lived link for the full storage path", async () => {
    const result = await vertragsdokumentOeffnenAction(MIETER_ID);
    expect(result).toEqual({ success: true, data: { url: "https://example.test/signed" } });
    expect(mockSignedUrls).toHaveBeenCalledWith([`${HAUS_ORDNER}/Vertraege/vertrag.pdf`], { expiresIn: 120 });
  });

  it("reports MV003 without a link and MV011 when the storage layer gives no URL", async () => {
    mvZeile = { data: { id: MV_ID, vertrag_dokument_id: null }, error: null };
    expect(await vertragsdokumentOeffnenAction(MIETER_ID)).toMatchObject({ success: false, error: { code: "MV003" } });
    mvZeile = { data: { id: MV_ID, vertrag_dokument_id: DOK_ID }, error: null };
    mockSignedUrls.mockResolvedValue([{ path: "x", url: null, error: "Zugriff verweigert" }]);
    expect(await vertragsdokumentOeffnenAction(MIETER_ID)).toMatchObject({ success: false, error: { code: "MV011" } });
  });

  it("does not leak storage errors as exceptions", async () => {
    mockSignedUrls.mockRejectedValue(new Error("Details, die nicht nach außen gehen"));
    const result = await vertragsdokumentOeffnenAction(MIETER_ID);
    expect(result).toMatchObject({ success: false, error: { code: "UNBEKANNT" } });
  });
});

/**
 * @jest-environment node
 */

/**
 * Tests of the receipt upload route (`POST /api/kautionen/belege`, GH-6, phase 2b).
 *
 * Covered: sign-in, module right, input checks, folder from the database (not from the client), upload path and
 * metadata, RPC arguments, rollback after a failed link, no file name in logs. The Supabase client, the storage and
 * the RPC are mocks; all names, IDs and files are synthetic.
 */

import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { logAction } from "@/lib/logging-middleware";
import { MAX_FILE_SIZE } from "@/lib/finance-file-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { POST } from "./route";
import { getAccessibleHaeuserIds } from "@/lib/object-scope";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/logging-middleware", () => ({ logAction: jest.fn() }));
jest.mock("@/lib/permissions", () => ({ hasPermission: jest.fn() }));
jest.mock("@/lib/auth-utils", () => ({ ensureAuth: jest.fn() }));

const USER_ID = "77777777-7777-4777-8777-777777777777";
const HAUS_ID = "55555555-5555-4555-8555-555555555555";
const WOHNUNG_ID = "66666666-6666-4666-8666-666666666666";
const MIETER_ID = "11111111-1111-4111-8111-111111111111";
const KAUTION_ID = "22222222-2222-4222-8222-222222222222";
const BEWEGUNG_ID = "33333333-3333-4333-8333-333333333333";
const DOKUMENT_ID = "99999999-9999-4999-8999-999999999999";
const ZEITSTEMPEL = 1765000000000;
const ORG_ID = "44444444-4444-4444-8444-444444444444";
const ORDNER = `org_${ORG_ID}/shared/${HAUS_ID}/${WOHNUNG_ID}/${MIETER_ID}`;
/** Houses the user may access (null = all houses). Changed per test for the scope cases. */
let zugaenglicheHaeuser: string[] | null = null;

const mockEnsureAuth = ensureAuth as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;
const mockLogAction = logAction as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

/** Database rows of the folder chain (booking -> deposit -> tenant -> apartment). `null` = not found. */
let db: Record<string, Record<string, unknown> | null>;
let metadatenAntwort: { data: unknown; error: unknown };

const mockRpc = jest.fn();
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockInsert = jest.fn();
const mockDeleteEq = jest.fn();

/** Database table as a chainable query builder (`select`, `eq`, `maybeSingle`, `insert`, `single`, `delete`). */
function tabelle(name: string) {
  const schluessel: Record<string, string> = {
    Kautionen_Bewegungen: "bewegung",
    Kautionen: "kaution",
    Mieter: "mieter",
    Wohnungen: "wohnung",
  };
  const chain: Record<string, unknown> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.maybeSingle = jest.fn(async () => ({ data: db[schluessel[name]] ?? null, error: null }));
  chain.insert = jest.fn((werte: unknown) => {
    mockInsert(werte);
    return chain;
  });
  chain.single = jest.fn(async () => metadatenAntwort);
  chain.delete = jest.fn(() => {
    mockDeleteEq(name);
    return chain;
  });
  // A delete is awaited directly (`await ...delete().eq(...)`): the chain resolves to the delete result.
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(resolve, reject);
  return chain;
}

const mockSupabase = {
  from: (name: string) => tabelle(name),
  rpc: (name: string, args: unknown) => {
    // Organisation and house scope are resolved by the helpers; the booking RPCs go to `mockRpc`.
    if (name === "current_organisation_id") return Promise.resolve({ data: ORG_ID, error: null });
    return mockRpc(name, args);
  },
  storage: {
    from: (bucket: string) => ({
      upload: (...args: unknown[]) => mockUpload(bucket, ...args),
      remove: (...args: unknown[]) => mockRemove(bucket, ...args),
    }),
  },
};

function vollstaendigeDb(): Record<string, Record<string, unknown> | null> {
  return {
    bewegung: { kaution_id: KAUTION_ID },
    kaution: { mieter_id: MIETER_ID },
    mieter: { id: MIETER_ID, wohnung_id: WOHNUNG_ID },
    wohnung: { id: WOHNUNG_ID, haus_id: HAUS_ID },
  };
}

/** Form request like `NextRequest` as far as the route uses it (`formData`, `headers.get`). */
function anfrage(felder: Record<string, string | File | undefined>, contentLength?: string): NextRequest {
  const formData = new FormData();
  for (const [schluessel, wert] of Object.entries(felder)) {
    if (wert === undefined) continue;
    if (typeof wert === "string") formData.append(schluessel, wert);
    else formData.append(schluessel, wert, wert.name);
  }
  // Browsers always send the length of a `FormData` body: the default stands for that (`null` = a chunked request without it).
  const laenge = contentLength === "keine" ? null : (contentLength ?? "2048");
  const headers = { get: (name: string) => (name.toLowerCase() === "content-length" ? laenge : null) };
  return { formData: jest.fn(async () => formData), headers } as unknown as NextRequest;
}

function pdf(name = "Rechnung Mai 2026.pdf", groesse = 2048): File {
  return new File([new Uint8Array(groesse)], name, { type: "application/pdf" });
}

/** The body of the answer as JSON (the test mock of `NextResponse` keeps the body as text). */
async function antwortJson(response: Response): Promise<{ success?: boolean; dokumentId?: string; error?: { message: string; code?: string } }> {
  return (await response.json()) as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, "now").mockReturnValue(ZEITSTEMPEL);
  mockEnsureAuth.mockResolvedValue({ user: { id: USER_ID }, supabase: mockSupabase });
  mockHasPermission.mockResolvedValue(true);
  zugaenglicheHaeuser = null;
  (getAccessibleHaeuserIds as jest.Mock).mockImplementation(async () => zugaenglicheHaeuser);
  db = vollstaendigeDb();
  metadatenAntwort = { data: { id: DOKUMENT_ID }, error: null };
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockUpload.mockResolvedValue({ data: { path: "ok" }, error: null });
  mockRemove.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Anmeldung und Modulrecht", () => {
  it("antwortet 401 ohne Anmeldung, ohne Datenbankzugriff und ohne Upload", async () => {
    mockEnsureAuth.mockRejectedValueOnce(new Error("Nicht authentifiziert. Bitte melden Sie sich an."));

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(401);
    expect((await antwortJson(response)).error?.code).toBe("KA001");
    expect(mockHasPermission).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("antwortet bei einem Infrastrukturfehler der Anmeldung mit 500 und ohne Anmeldehinweis", async () => {
    mockEnsureAuth.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(500);
    expect(await antwortJson(response)).toEqual({ error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
  });

  it("antwortet 403 ohne das Recht 'bearbeiten' und prüft beide Rechte", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "bearbeiten");

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(403);
    expect((await antwortJson(response)).error?.code).toBe("42501");
    expect(mockHasPermission).toHaveBeenCalledWith("kautionen", "bearbeiten");
    expect(mockHasPermission).toHaveBeenCalledWith("kautionen", "ansehen");
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("antwortet 403 ohne das Recht 'ansehen' (die Datenbank verlangt es auch)", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "ansehen");

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(403);
    expect(mockUpload).not.toHaveBeenCalled();
  });
});

describe("Eingaben", () => {
  it("lehnt eine ungültige Buchungs-ID ab (400), ohne Datenbankzugriff", async () => {
    const response = await POST(anfrage({ bewegungId: "keine-uuid", file: pdf() }));

    expect(response.status).toBe(400);
    expect((await antwortJson(response)).error?.message).toBe("Ungültige Buchungs-ID.");
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("lehnt eine fehlende Datei ab (400)", async () => {
    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID }));

    expect(response.status).toBe(400);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("lehnt eine leere Datei ab (400)", async () => {
    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf("leer.pdf", 0) }));

    expect(response.status).toBe(400);
    expect((await antwortJson(response)).error?.message).toBe("Die Datei ist leer.");
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("lehnt eine zu große Datei ab (413)", async () => {
    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf("gross.pdf", MAX_FILE_SIZE + 1) }));

    expect(response.status).toBe(413);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("weist eine zu große Anfrage schon am Content-Length ab, ohne den Körper zu lesen (413)", async () => {
    const request = anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }, String(MAX_FILE_SIZE + 5 * 1024 * 1024));

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(request.formData).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("lehnt eine Anfrage ohne Größenangabe ab, ohne den Körper zu lesen (411)", async () => {
    const request = anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }, "keine");

    const response = await POST(request);

    expect(response.status).toBe(411);
    expect(request.formData).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("lehnt einen nicht unterstützten Dateityp ab (400), ohne den Typ zu spiegeln", async () => {
    const programm = new File([new Uint8Array(10)], "Muster.exe", { type: "application/x-msdownload" });

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: programm }));

    expect(response.status).toBe(400);
    expect(JSON.stringify(await antwortJson(response))).not.toContain("x-msdownload");
    expect(mockUpload).not.toHaveBeenCalled();
  });
});

describe("Ordner aus der Datenbank", () => {
  it("antwortet 404, wenn die Buchung nicht sichtbar oder nicht vorhanden ist (ohne Upload)", async () => {
    db.bewegung = null;

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(404);
    expect((await antwortJson(response)).error?.code).toBe("KA003");
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("antwortet 404, wenn der Mieter keiner Wohnung zugeordnet ist", async () => {
    db.mieter = { id: MIETER_ID, wohnung_id: null };

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(404);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("lehnt den Upload ab, wenn das Haus nicht im Haus-Scope des Nutzers liegt (kein Upload, keine Metadaten)", async () => {
    zugaenglicheHaeuser = ["99999999-0000-4000-8000-000000000000"];

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(403);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalledWith("kaution_beleg_zuordnen", expect.anything());
  });

  it("nimmt den Ordner aus der Datenbank und nie aus den Feldern des Clients", async () => {
    const response = await POST(
      anfrage({
        bewegungId: BEWEGUNG_ID,
        file: pdf(),
        ordner: "user_fremd/andere/haus/mieter",
        dateipfad: "user_fremd/x",
        haus_id: "fremde-haus-id",
        mieter_id: "fremder-mieter",
      })
    );

    expect(response.status).toBe(200);
    const [pfad] = mockUpload.mock.calls[0].slice(1);
    expect(pfad).toBe(`${ORDNER}/${ZEITSTEMPEL}_Rechnung_Mai_2026.pdf`);
    expect(JSON.stringify(mockUpload.mock.calls)).not.toContain("fremd");
    expect(JSON.stringify(mockInsert.mock.calls)).not.toContain("fremd");
  });
});

describe("Erfolgsfall", () => {
  it("lädt in den Bucket 'documents', legt die Metadaten an und ordnet den Beleg der Buchung zu", async () => {
    const datei = pdf("Rechnung Mai 2026.pdf", 4096);

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: datei }));

    expect(response.status).toBe(200);
    expect(await antwortJson(response)).toEqual({ success: true, dokumentId: DOKUMENT_ID });

    const pfad = `${ORDNER}/${ZEITSTEMPEL}_Rechnung_Mai_2026.pdf`;
    expect(mockUpload).toHaveBeenCalledWith("documents", pfad, datei, { contentType: "application/pdf", upsert: false });

    expect(mockInsert).toHaveBeenCalledWith({
      dateipfad: ORDNER,
      dateiname: `${ZEITSTEMPEL}_Rechnung_Mai_2026.pdf`,
      dateigroesse: 4096,
      mime_type: "application/pdf",
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("kaution_beleg_zuordnen", { p_bewegung_id: BEWEGUNG_ID, p_dokument_id: DOKUMENT_ID });
  });

  it("aktualisiert den Kontoauszug nach dem Erfolg und entfernt nichts", async () => {
    await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockDeleteEq).not.toHaveBeenCalled();
  });
});

describe("Rückabwicklung", () => {
  it("entfernt Metadaten und Datei wieder, wenn die Zuordnung fehlschlägt, und meldet den Fehler", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "KA002", message: "KAUT_OBJEKTZUGRIFF: Kein Zugriff." } });

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(403);
    expect((await antwortJson(response)).error).toEqual({ message: "Kein Zugriff auf dieses Objekt.", code: "KA002" });
    expect(mockRemove).toHaveBeenCalledWith("documents", [`${ORDNER}/${ZEITSTEMPEL}_Rechnung_Mai_2026.pdf`]);
    expect(mockDeleteEq).toHaveBeenCalledWith("Dokumente_Metadaten");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("nimmt auch bei einer Ausnahme in der Zuordnung beides zurück (kein verwaister Beleg)", async () => {
    mockRpc.mockRejectedValueOnce(new Error("Netzwerk weg"));

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(500);
    expect(await antwortJson(response)).toEqual({ error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockDeleteEq).toHaveBeenCalledWith("Dokumente_Metadaten");
  });

  it("entfernt die Datei wieder, wenn die Metadaten nicht angelegt werden können, und ruft die Zuordnung nicht auf", async () => {
    metadatenAntwort = { data: null, error: { message: "duplicate key" } };

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(500);
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("legt bei einem Upload-Fehler nichts an und gibt eine neutrale Meldung zurück", async () => {
    mockUpload.mockResolvedValueOnce({ data: null, error: { message: "storage down" } });

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(500);
    expect((await antwortJson(response)).error?.message).toBe("Die Datei konnte nicht hochgeladen werden.");
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("Protokollierung", () => {
  it("protokolliert nie den Dateinamen, nur Aktion, Status und Fehlercode", async () => {
    const consoleSpies = [jest.spyOn(console, "log"), jest.spyOn(console, "info"), jest.spyOn(console, "warn"), jest.spyOn(console, "error")];
    const geheimerName = "Mustermann_Gehalt_Geheim.pdf";

    await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf(geheimerName) }));
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "KA004", message: "KAUT_EINGABE_UNGUELTIG: x" } });
    await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf(geheimerName) }));

    const protokoll = JSON.stringify(mockLogAction.mock.calls);
    expect(protokoll).not.toContain("Mustermann");
    expect(protokoll).not.toContain("Geheim");
    expect(protokoll).not.toContain("Gehalt");
    expect(mockLogAction).toHaveBeenCalledWith("kautionBelegHochladen", "success", {});
    expect(mockLogAction).toHaveBeenCalledWith("kautionBelegHochladen", "failed", { code: "KA004" });
    for (const spy of consoleSpies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("Mustermann");
    }
  });

  it("protokolliert einen unerwarteten Fehler nur mit Code, ohne die Meldung der Ausnahme", async () => {
    mockHasPermission.mockRejectedValueOnce(new Error("Muster-Detail mit Pfad user_x"));

    const response = await POST(anfrage({ bewegungId: BEWEGUNG_ID, file: pdf() }));

    expect(response.status).toBe(500);
    expect(JSON.stringify(mockLogAction.mock.calls)).not.toContain("Muster-Detail");
    expect(mockLogAction).toHaveBeenCalledWith("kautionBelegHochladen", "error", { code: "UNEXPECTED" });
  });
});

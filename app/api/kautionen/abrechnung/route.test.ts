/**
 * @jest-environment node
 */

/**
 * Tests of the settlement PDF route (`POST /api/kautionen/abrechnung`, GH-6, phase 4).
 *
 * Covered: request form (JSON, not cross-site), input checks, sign-in and module right (through the real settlement
 * action), figures only from the database result (never from the request), neutral answers for "not visible", worker
 * errors (status, timeout, size, content, one retry), the answer headers and the log content. The Supabase client, the
 * worker (`fetch`) and the environment are mocks; all names, IDs and figures are synthetic.
 */

import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { logAction } from "@/lib/logging-middleware";
import { KAUTION_ABRECHNUNG_MAX_PDF_BYTES } from "@/lib/kautionen-abrechnung";
import { POST } from "./route";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/logging-middleware", () => ({ logAction: jest.fn() }));
jest.mock("@/lib/permissions", () => ({ hasPermission: jest.fn() }));
jest.mock("@/lib/auth-utils", () => ({ ensureAuth: jest.fn() }));

const USER_ID = "77777777-7777-4777-8777-777777777777";
const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const SCOPE_RPC = "kautionen_pruefe_objektzugriff";
const ABRECHNUNG_RPC = "get_kaution_abrechnung";
const WORKER_URL = "https://worker.example.invalid";
const WORKER_KEY = "synthetic-worker-key";

const MSG_NICHT_VERFUEGBAR = "Die Kautionsabrechnung ist für diesen Mieter nicht verfügbar.";
const MSG_WORKER = "Die Kautionsabrechnung konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.";
const MSG_FALLBACK = "Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.";

/** Synthetic settlement as `get_kaution_abrechnung` returns it. */
const ABRECHNUNG = {
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
  bewegungen: [],
  storniert_anzahl: 0,
};

const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\n% synthetisches Testdokument\n%%EOF");

const mockEnsureAuth = ensureAuth as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;
const mockLogAction = logAction as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

const mockRpc = jest.fn();
const mockScopeRpc = jest.fn();
const mockSupabase = {
  rpc: (name: string, args: unknown) => (name === SCOPE_RPC ? mockScopeRpc(args) : mockRpc(name, args)),
};

const mockFetch = jest.fn();

/** Request as far as the route uses it (`headers.get`, `text`). */
function anfrage(
  body: unknown,
  kopf: { contentType?: string | null; secFetchSite?: string | null; contentLength?: string | null } = {},
  roh?: string
): NextRequest {
  const text = roh ?? JSON.stringify(body);
  const werte: Record<string, string | null> = {
    "content-type": kopf.contentType === undefined ? "application/json" : kopf.contentType,
    "sec-fetch-site": kopf.secFetchSite === undefined ? "same-origin" : kopf.secFetchSite,
    "content-length": kopf.contentLength === undefined ? null : kopf.contentLength,
  };
  return {
    headers: { get: (name: string) => werte[name.toLowerCase()] ?? null },
    text: jest.fn(async () => text),
  } as unknown as NextRequest;
}

/** Answer of the worker with a PDF (or the given bytes and headers). */
function pdfAntwort(bytes: Uint8Array = PDF_BYTES, kopf: Record<string, string> = {}) {
  const werte: Record<string, string> = {
    "content-type": "application/pdf",
    "content-length": String(bytes.byteLength),
    ...kopf,
  };
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => werte[name.toLowerCase()] ?? null },
    body: null,
    arrayBuffer: jest.fn(async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
  };
}

/** Worker answer with an HTTP error status. */
function fehlerAntwort(status: number, text: string) {
  return {
    ok: false,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "text/plain" : null) },
    body: null,
    text: jest.fn(async () => text),
  };
}

/** Payload of the first worker call. */
function gesendeteNutzlast(): Record<string, unknown> {
  const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MIETEVO_BACKEND_URL = WORKER_URL;
  process.env.WORKER_AUTH_KEY = WORKER_KEY;
  mockEnsureAuth.mockResolvedValue({ user: { id: USER_ID }, supabase: mockSupabase });
  mockHasPermission.mockResolvedValue(true);
  mockScopeRpc.mockResolvedValue({ data: null, error: null });
  mockRpc.mockResolvedValue({ data: ABRECHNUNG, error: null });
  mockFetch.mockResolvedValue(pdfAntwort());
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const GUELTIG = { tenantId: TENANT_ID, art: "zwischen", stichtag: "2026-03-15" };

describe("Anmeldung und Modulrecht", () => {
  it("answers 401 without sign-in, with no database query and no worker call", async () => {
    mockEnsureAuth.mockRejectedValueOnce(new Error("Nicht authentifiziert. Bitte melden Sie sich an."));

    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { message: "Bitte melden Sie sich erneut an." } });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("answers 403 without the module right `ansehen`, with no figures and no worker call", async () => {
    mockHasPermission.mockResolvedValue(false);

    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { message: "Für diese Aktion fehlt die Berechtigung (Modul Kautionen)." } });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("Anfrageform und Eingaben", () => {
  it("answers 415 for every content type other than JSON, with no query and no worker call", async () => {
    for (const contentType of [null, "text/plain", "application/x-www-form-urlencoded"]) {
      const response = await POST(anfrage(GUELTIG, { contentType }));
      expect(response.status).toBe(415);
    }
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("answers 403 for a request the browser marks as cross-site", async () => {
    const response = await POST(anfrage(GUELTIG, { secFetchSite: "cross-site" }));

    expect(response.status).toBe(403);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("answers 413 for a declared body above the limit, without reading it", async () => {
    const anfrageObj = anfrage(GUELTIG, { contentLength: "999999" });

    const response = await POST(anfrageObj);

    expect(response.status).toBe(413);
    expect((anfrageObj as unknown as { text: jest.Mock }).text).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("answers 413 for a body above the limit without a declared length, and stops reading at the limit", async () => {
    const stuecke = [new Uint8Array(3 * 1024), new Uint8Array(3 * 1024), new Uint8Array(3 * 1024)];
    let gelesen = 0;
    const strom = new ReadableStream<Uint8Array>({
      pull(controller) {
        const stueck = stuecke[gelesen++];
        if (stueck) controller.enqueue(stueck);
        else controller.close();
      },
    });
    const anfrageObj = anfrage(GUELTIG);
    (anfrageObj as unknown as { body: ReadableStream<Uint8Array> }).body = strom;

    const response = await POST(anfrageObj);

    expect(response.status).toBe(413);
    expect((anfrageObj as unknown as { text: jest.Mock }).text).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("reads a small streamed body without a declared length", async () => {
    const anfrageObj = anfrage(GUELTIG);
    const bytes = new TextEncoder().encode(JSON.stringify({ ...GUELTIG, tenantId: "keine-id" }));
    (anfrageObj as unknown as { body: ReadableStream<Uint8Array> }).body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });

    const response = await POST(anfrageObj);

    expect(response.status).toBe(400); // read and parsed (invalid tenant ID), not 413
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("answers 400 for broken JSON and for a body that is not an object", async () => {
    expect((await POST(anfrage(null, {}, "{nicht json"))).status).toBe(400);
    expect((await POST(anfrage([GUELTIG]))).status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each([
    ["an invalid tenant ID", { ...GUELTIG, tenantId: "keine-id" }],
    ["a missing tenant ID", { art: "end" }],
    ["an unknown kind", { ...GUELTIG, art: "final" }],
    ["an invalid settlement date", { ...GUELTIG, stichtag: "2026-02-30" }],
    ["a date in another format", { ...GUELTIG, stichtag: "15.03.2026" }],
  ])("answers 400 for %s, with no query and no worker call", async (_label, body) => {
    const response = await POST(anfrage(body));

    expect(response.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("answers 400 with a German message that does not repeat the rejected value", async () => {
    const response = await POST(anfrage({ ...GUELTIG, tenantId: "Muster-Eingabe-Wert" }));
    const antwort = (await response.json()) as { error: { message: string } };

    expect(response.status).toBe(400);
    expect(antwort.error.message).toBe("Ungültige Mieter-ID.");
    expect(JSON.stringify(antwort)).not.toContain("Muster-Eingabe-Wert");
  });
});

describe("Daten nur aus der Datenbank", () => {
  it("sends the figures of the database to the worker, never values from the request body", async () => {
    const response = await POST(
      anfrage({
        ...GUELTIG,
        data: { konto: { kontostand: 999999 }, mieter: { name: "Fremder Name" } },
        filename: "../../eingeschleust.pdf",
        user_id: "88888888-8888-4888-8888-888888888888",
        template: "fremd",
      })
    );

    expect(response.status).toBe(200);
    const nutzlast = gesendeteNutzlast();
    expect(Object.keys(nutzlast).sort()).toEqual(["data", "filename", "template", "type"]);
    expect(nutzlast).toMatchObject({
      type: "pdf",
      template: "kaution-abrechnung",
      filename: "Kautionsabrechnung-Zwischen-2026-03-15.pdf",
    });
    const daten = nutzlast.data as Record<string, unknown>;
    expect(daten.konto).toEqual(ABRECHNUNG.konto);
    expect(daten.mieter).toEqual(ABRECHNUNG.mieter);
    expect(daten.art).toBe("zwischen");
    expect(nutzlast.user_id).toBeUndefined();
    expect(JSON.stringify(nutzlast)).not.toContain("Fremder Name");
    expect(JSON.stringify(nutzlast)).not.toContain("eingeschleust");
  });

  it("reads the settlement through the action: tenant and settlement date are passed to the database", async () => {
    await POST(anfrage(GUELTIG));

    expect(mockScopeRpc).toHaveBeenCalledWith({ p_mieter_id: TENANT_ID });
    expect(mockRpc).toHaveBeenCalledWith(ABRECHNUNG_RPC, { p_mieter_id: TENANT_ID, p_stichtag: "2026-03-15" });
  });

  it("uses the settlement date of the database result for the file name when none is sent", async () => {
    const response = await POST(anfrage({ tenantId: TENANT_ID, art: "end" }));

    expect(response.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith(ABRECHNUNG_RPC, { p_mieter_id: TENANT_ID, p_stichtag: null });
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="Kautionsabrechnung-End-2026-03-15.pdf"');
  });

  it("answers 404 with the neutral message when the database has no settlement (NULL)", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { message: MSG_NICHT_VERFUEGBAR } });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("answers the same 404 when the deposit is outside the object scope, so no existence is revealed", async () => {
    mockScopeRpc.mockResolvedValueOnce({ data: null, error: { code: "KA002", message: "KAUT_OBJEKTZUGRIFF: x" } });

    const ohneZugriff = await POST(anfrage(GUELTIG));
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    const nichtVorhanden = await POST(anfrage(GUELTIG));

    expect(ohneZugriff.status).toBe(404);
    expect(nichtVorhanden.status).toBe(404);
    expect(await ohneZugriff.json()).toEqual(await nichtVorhanden.json());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("answers 400 when the database rejects the settlement date (KA013, fixed text)", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "KA013", message: "KA013: Stichtag liegt in der Zukunft." } });

    const response = await POST(anfrage({ ...GUELTIG, stichtag: "2099-01-01" }));

    expect(response.status).toBe(400);
    expect((await response.json()) as { error: { message: string } }).toEqual({
      error: { message: "Das Datum oder der Zeitraum ist ungültig (z. B. ein Datum in der Zukunft oder ein Ende vor dem Beginn)." },
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("Erfolgsantwort", () => {
  it("returns the PDF bytes with the content type, the fixed file name and the security headers", async () => {
    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="Kautionsabrechnung-Zwischen-2026-03-15.pdf"');
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(response.body as unknown as ArrayBuffer)).toEqual(PDF_BYTES);
  });

  it("names the end settlement `End`", async () => {
    const response = await POST(anfrage({ ...GUELTIG, art: "end" }));

    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="Kautionsabrechnung-End-2026-03-15.pdf"');
  });

  it("calls the worker once with the shared key, a JSON body and no redirects", async () => {
    await POST(anfrage(GUELTIG));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe(WORKER_URL);
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect(init.headers["x-worker-auth"]).toBe(WORKER_KEY);
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("logs the success with the kind, the status and the duration only", async () => {
    await POST(anfrage(GUELTIG));

    expect(mockLogAction).toHaveBeenCalledWith("kautionAbrechnungPdf", "success", {
      art: "zwischen",
      status: 200,
      dauer_ms: expect.any(Number),
    });
    const protokoll = JSON.stringify(mockLogAction.mock.calls);
    expect(protokoll).not.toContain("Muster");
    expect(protokoll).not.toContain(TENANT_ID);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("Worker-Fehler (502, neutrale Meldung)", () => {
  it("answers 502 when the worker fails, without passing on its text", async () => {
    mockFetch.mockResolvedValueOnce(fehlerAntwort(500, "Interner Fehler bei Muster-Detail"));

    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(502);
    const antwort = (await response.json()) as { error: { message: string } };
    expect(antwort.error.message).toBe(MSG_WORKER);
    expect(JSON.stringify(antwort)).not.toContain("Muster-Detail");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("answers 502 for an answer that is not a PDF (content type)", async () => {
    mockFetch.mockResolvedValueOnce(pdfAntwort(PDF_BYTES, { "content-type": "text/html" }));

    expect((await POST(anfrage(GUELTIG))).status).toBe(502);
  });

  it("answers 502 for an answer that is declared larger than the limit, without reading it", async () => {
    const antwort = pdfAntwort(PDF_BYTES, { "content-length": String(KAUTION_ABRECHNUNG_MAX_PDF_BYTES + 1) });
    mockFetch.mockResolvedValueOnce(antwort);

    expect((await POST(anfrage(GUELTIG))).status).toBe(502);
    expect(antwort.arrayBuffer).not.toHaveBeenCalled();
  });

  it("answers 502 for an answer that is larger than the limit in fact", async () => {
    const zuGross = new Uint8Array(KAUTION_ABRECHNUNG_MAX_PDF_BYTES + 1);
    zuGross.set(PDF_BYTES.subarray(0, PDF_BYTES.byteLength));
    mockFetch.mockResolvedValueOnce(pdfAntwort(zuGross, { "content-length": "" }));

    expect((await POST(anfrage(GUELTIG))).status).toBe(502);
  });

  it("answers 502 for an answer with the right type but without the PDF signature", async () => {
    mockFetch.mockResolvedValueOnce(pdfAntwort(new TextEncoder().encode("<html>kein PDF</html>")));

    expect((await POST(anfrage(GUELTIG))).status).toBe(502);
  });

  it("answers 502 on a timeout and does not retry it", async () => {
    mockFetch.mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "AbortError" }));

    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(502);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries a network error once and then answers with the PDF", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(pdfAntwort());

    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("makes at most two attempts on repeated network errors", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(502);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not call the worker without the shared key and answers 502", async () => {
    delete process.env.WORKER_AUTH_KEY;

    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(502);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uses the same default worker URL as the other callers when the variable is not set", async () => {
    delete process.env.MIETEVO_BACKEND_URL;
    mockFetch.mockResolvedValueOnce(pdfAntwort());

    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(200);
    expect(mockFetch.mock.calls[0]?.[0]).toBe("https://backend.mietevo.de");
  });

  it("does not send the shared key over plain HTTP in production", async () => {
    process.env.MIETEVO_BACKEND_URL = "http://worker.example.invalid";
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";

    const response = await POST(anfrage(GUELTIG));

    expect(response.status).toBe(502);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("logs the worker error with the code only", async () => {
    mockFetch.mockResolvedValueOnce(fehlerAntwort(500, "Muster-Detail"));

    await POST(anfrage(GUELTIG));

    expect(mockLogAction).toHaveBeenCalledWith("kautionAbrechnungPdf", "error", {
      art: "zwischen",
      status: 502,
      code: "HTTP_500",
      dauer_ms: expect.any(Number),
    });
    expect(JSON.stringify(mockLogAction.mock.calls)).not.toContain("Muster-Detail");
  });
});

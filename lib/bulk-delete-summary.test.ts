import {
  DELETE_BLOCKED_SQLSTATE,
  buildBulkDeleteResponse,
  createDeleteError,
  formatBulkDeleteSuffix,
  formatFailureReasons,
  isDeleteBlockedError,
  stripDbCodePrefix,
  summarizeBulkDeleteResults,
  summarizeSettledDeletes,
} from "@/lib/bulk-delete-summary";

const ok = (): PromiseFulfilledResult<{ success: boolean }> => ({ status: "fulfilled", value: { success: true } });
const failed = (message?: string): PromiseFulfilledResult<{ success: boolean; error?: { message?: string } }> => ({
  status: "fulfilled",
  value: { success: false, error: message === undefined ? undefined : { message } },
});
const rejected = (): PromiseRejectedResult => ({ status: "rejected", reason: new Error("netzwerk") });

describe("stripDbCodePrefix", () => {
  it("removes the stable code prefix of a database message", () => {
    expect(stripDbCodePrefix("KAUT_GESPERRT: Der Mieter hat eine hinterlegte Kaution.")).toBe("Der Mieter hat eine hinterlegte Kaution.");
  });

  it("leaves messages without a code prefix unchanged", () => {
    expect(stripDbCodePrefix("Delete failed")).toBe("Delete failed");
    expect(stripDbCodePrefix("Permission denied: record is outside your object scope")).toBe(
      "Permission denied: record is outside your object scope"
    );
  });

  it("handles an empty string", () => {
    expect(stripDbCodePrefix("")).toBe("");
  });
});

describe("summarizeBulkDeleteResults", () => {
  it("counts successes and failures and collects each reason once", () => {
    const summary = summarizeBulkDeleteResults([
      ok(),
      failed("KAUT_GESPERRT: Der Mieter hat eine hinterlegte Kaution."),
      failed("KAUT_GESPERRT: Der Mieter hat eine hinterlegte Kaution."),
      failed("Keine Berechtigung"),
      rejected(),
    ]);

    expect(summary.successCount).toBe(1);
    expect(summary.errorCount).toBe(4);
    expect(summary.reasons).toEqual(["Der Mieter hat eine hinterlegte Kaution.", "Keine Berechtigung"]);
  });

  it("returns no reasons when all deletions succeed or failures carry no message", () => {
    expect(summarizeBulkDeleteResults([ok(), ok()])).toEqual({ successCount: 2, errorCount: 0, reasons: [] });
    expect(summarizeBulkDeleteResults([failed(), rejected()])).toEqual({ successCount: 0, errorCount: 2, reasons: [] });
  });

  it("ignores blank messages and truncates very long ones", () => {
    const summary = summarizeBulkDeleteResults([failed("   "), failed("x".repeat(1000))]);
    expect(summary.reasons).toHaveLength(1);
    expect(summary.reasons[0]).toHaveLength(300);
  });
});

describe("formatFailureReasons", () => {
  it("returns an empty text without reasons", () => {
    expect(formatFailureReasons([])).toBe("");
  });

  it("uses the singular for one reason", () => {
    expect(formatFailureReasons(["Grund A"])).toBe("Grund: Grund A");
  });

  it("uses the plural for several reasons and shortens long lists", () => {
    expect(formatFailureReasons(["A", "B"])).toBe("Gründe: A | B");
    expect(formatFailureReasons(["A", "B", "C", "D", "E"])).toBe("Gründe: A | B | C (und 2 weitere)");
    expect(formatFailureReasons(["A", "B", "C", "D"], 2)).toBe("Gründe: A | B (und 2 weitere)");
  });
});

describe("createDeleteError / isDeleteBlockedError", () => {
  it("creates an error with the message without prefix and keeps the SQLSTATE as code", () => {
    const error = createDeleteError("KAUT_GESPERRT: Der Mieter hat eine hinterlegte Kaution.", "KA009") as Error & { code?: string };

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Der Mieter hat eine hinterlegte Kaution.");
    expect(error.code).toBe("KA009");
    expect(isDeleteBlockedError(error)).toBe(true);
  });

  it("sets no code without a SQLSTATE and recognises only the lock code as blocked", () => {
    expect(createDeleteError("Verbindung unterbrochen")).not.toHaveProperty("code");
    expect(isDeleteBlockedError(createDeleteError("Verbindung unterbrochen"))).toBe(false);
    expect(isDeleteBlockedError(createDeleteError("Nicht erlaubt", "42501"))).toBe(false);
    expect(isDeleteBlockedError(DELETE_BLOCKED_SQLSTATE)).toBe(false);
    expect(isDeleteBlockedError(null)).toBe(false);
    expect(isDeleteBlockedError(undefined)).toBe(false);
  });
});

describe("summarizeSettledDeletes", () => {
  const rejectedWith = (message: string, code?: string): PromiseRejectedResult => ({
    status: "rejected",
    reason: createDeleteError(message, code),
  });
  const fulfilled = (): PromiseFulfilledResult<void> => ({ status: "fulfilled", value: undefined });

  it("counts successes and failures and uses the message of the error as reason (without prefix, each once)", () => {
    const summary = summarizeSettledDeletes([
      fulfilled(),
      rejectedWith("KAUT_GESPERRT: Der Mieter hat eine hinterlegte Kaution.", "KA009"),
      rejectedWith("KAUT_GESPERRT: Der Mieter hat eine hinterlegte Kaution.", "KA009"),
      rejectedWith("Keine Berechtigung"),
    ]);

    expect(summary).toEqual({
      successCount: 1,
      errorCount: 3,
      reasons: ["Der Mieter hat eine hinterlegte Kaution.", "Keine Berechtigung"],
      blocked: true,
    });
  });

  it("is not blocked when the failures are technical", () => {
    const summary = summarizeSettledDeletes([rejectedWith("Zeitüberschreitung", "57014"), { status: "rejected", reason: "kein Error-Objekt" }]);

    expect(summary).toEqual({ successCount: 0, errorCount: 2, reasons: ["Zeitüberschreitung"], blocked: false });
  });

  it("removes a prefix that only appears in the raw message of a plain error", () => {
    const summary = summarizeSettledDeletes([{ status: "rejected", reason: new Error("KAUT_GESPERRT: Gesperrt.") }]);

    expect(summary.reasons).toEqual(["Gesperrt."]);
  });
});

describe("buildBulkDeleteResponse", () => {
  const fallback = "Die Mieter konnten nicht gelöscht werden.";

  it("answers 200 with the counts when everything was deleted", () => {
    expect(buildBulkDeleteResponse({ successCount: 3, errorCount: 0, reasons: [] }, fallback)).toEqual({
      status: 200,
      body: { successCount: 3, errorCount: 0, reasons: [] },
    });
  });

  it("answers 200 with counts and reasons on a partial success (the list has to be reloaded)", () => {
    const response = buildBulkDeleteResponse({ successCount: 2, errorCount: 1, reasons: ["Der Mieter hat eine hinterlegte Kaution."], blocked: true }, fallback);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ successCount: 2, errorCount: 1, reasons: ["Der Mieter hat eine hinterlegte Kaution."] });
    expect(response.body).not.toHaveProperty("error");
  });

  it("answers 409 with the reasons as error when nothing was deleted because of a lock", () => {
    const response = buildBulkDeleteResponse({ successCount: 0, errorCount: 2, reasons: ["Grund A.", "Grund B."], blocked: true }, fallback);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ successCount: 0, errorCount: 2, reasons: ["Grund A.", "Grund B."], error: "Grund A. Grund B." });
  });

  it("answers 500 for technical failures and uses the fallback text without reasons", () => {
    const response = buildBulkDeleteResponse({ successCount: 0, errorCount: 1, reasons: [], blocked: false }, fallback);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe(fallback);
  });
});

describe("formatBulkDeleteSuffix", () => {
  it("ends the sentence without failures", () => {
    expect(formatBulkDeleteSuffix(0, [])).toBe(".");
    expect(formatBulkDeleteSuffix(0, ["Grund"])).toBe(".");
  });

  it("names the number of failures and the reasons", () => {
    expect(formatBulkDeleteSuffix(2, ["Der Mieter hat eine hinterlegte Kaution."])).toBe(
      ", 2 fehlgeschlagen. Grund: Der Mieter hat eine hinterlegte Kaution."
    );
    expect(formatBulkDeleteSuffix(3, ["A", "B"])).toBe(", 3 fehlgeschlagen. Gründe: A | B");
  });

  it("names only the number if there is no reason", () => {
    expect(formatBulkDeleteSuffix(1, [])).toBe(", 1 fehlgeschlagen.");
  });
});

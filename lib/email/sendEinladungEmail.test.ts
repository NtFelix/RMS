import { sendEinladungEmail } from "./sendEinladungEmail";

const defaultOptions = {
  toEmail: "test@example.com",
  einladerName: "Admin User",
  organisationsName: "Test GmbH",
  rolle: "mitarbeiter" as const,
  token: "test-token-123",
};

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("sendEinladungEmail", () => {
  it("should skip sending when RESEND_API_KEY is not set", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await sendEinladungEmail(defaultOptions);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("RESEND_API_KEY is not set")
    );
  });

  it("should send email via Resend API when configured", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "Test <test@example.com>";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const fetchSpy = jest.spyOn(global, "fetch");

    await sendEinladungEmail(defaultOptions);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key",
          "Content-Type": "application/json",
        }),
      })
    );

    const callBody = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string
    );
    expect(callBody.from).toBe("Test <test@example.com>");
    expect(callBody.to).toBe("test@example.com");
    expect(callBody.subject).toContain("Test GmbH");
    expect(callBody.html).toContain("mietevo");
  });

  it("should handle network failure without throwing", async () => {
    process.env.RESEND_API_KEY = "re_test_key";

    jest.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await sendEinladungEmail(defaultOptions);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Network error"),
      expect.stringContaining("Network error")
    );
  });

  it("should handle non-ok response without throwing", async () => {
    process.env.RESEND_API_KEY = "re_test_key";

    jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("rate limited", { status: 429 })
    );
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await sendEinladungEmail(defaultOptions);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Resend API returned 429")
    );
  });

  it("should include the acceptance URL built from NEXT_PUBLIC_APP_URL + token in the HTML", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "Test <test@example.com>";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.mietevo.de";

    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "mock-id" }), { status: 200 })
    );

    await sendEinladungEmail({ ...defaultOptions, token: "abc-123-xyz" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string
    );
    expect(callBody.html).toContain(
      "https://app.mietevo.de/einladung/annehmen?token=abc-123-xyz"
    );
  });
});

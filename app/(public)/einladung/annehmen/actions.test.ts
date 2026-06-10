import { acceptEinladungAction } from "./actions";

const mockRpc = jest.fn();
const mockGetUser = jest.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  rpc: mockRpc,
};

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(() => mockSupabase),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("acceptEinladungAction", () => {
  it("should reject empty token", async () => {
    const result = await acceptEinladungAction("");
    expect(result).toEqual({ success: false, error: "Ungültiger Einladungslink.", code: "not_found" });
  });

  it("should reject invalid token type", async () => {
    const result = await acceptEinladungAction("   ");
    expect(result).toEqual({ success: false, error: "Ungültiger Einladungslink.", code: "not_found" });
  });

  it("should return not_authenticated when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await acceptEinladungAction("valid-token");
    expect(result).toEqual({ success: false, error: expect.any(String), code: "not_authenticated" });
  });

  it("should return not_authenticated on auth error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Auth failed") });

    const result = await acceptEinladungAction("valid-token");
    expect(result).toEqual({ success: false, error: expect.any(String), code: "not_authenticated" });
  });

  it("should return not_authenticated when getUser throws", async () => {
    mockGetUser.mockRejectedValue(new Error("Network error"));

    const result = await acceptEinladungAction("valid-token");
    expect(result).toEqual({ success: false, error: "Authentifizierungsfehler.", code: "not_authenticated" });
  });

  it("should return email_mismatch when RPC says email does not match", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ error: { message: "email does not match" } });

    const result = await acceptEinladungAction("valid-token");
    expect(result).toMatchObject({ success: false, code: "email_mismatch" });
  });

  it("should return expired when invitation is expired", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ error: { message: "Invitation expired" } });

    const result = await acceptEinladungAction("valid-token");
    expect(result).toMatchObject({ success: false, code: "expired" });
  });

  it("should return not_found when invitation not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ error: { message: "Invitation not found" } });

    const result = await acceptEinladungAction("valid-token");
    expect(result).toMatchObject({ success: false, code: "not_found" });
  });

  it("should return not_found for not open", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ error: { message: "Invitation not open" } });

    const result = await acceptEinladungAction("valid-token");
    expect(result).toMatchObject({ success: false, code: "not_found" });
  });

  it("should return unknown for generic RPC errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ error: { message: "Some other database error" } });

    const result = await acceptEinladungAction("valid-token");
    expect(result).toMatchObject({ success: false, code: "unknown" });
  });

  it("should return unknown when RPC throws unexpectedly", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockRejectedValue(new Error("Unexpected error"));

    const result = await acceptEinladungAction("valid-token");
    expect(result).toMatchObject({ success: false, code: "unknown" });
  });

  it("should return success when everything works", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ error: null });

    const result = await acceptEinladungAction("valid-token");
    expect(result).toEqual({ success: true });
  });

  it("should trim whitespace from token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ error: null });

    const result = await acceptEinladungAction("  valid-token  ");
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("accept_einladung", { p_token: "valid-token" });
  });
});

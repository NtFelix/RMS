import { isValidRedirect, isValidSupabaseRedirect } from "./oauth-utils";

describe("isValidRedirect", () => {
    it("should return false for invalid or missing URLs", () => {
        expect(isValidRedirect(null)).toBe(false);
        expect(isValidRedirect(undefined)).toBe(false);
        expect(isValidRedirect("")).toBe(false);
        expect(isValidRedirect("not a url")).toBe(false);
    });

    it("should return false for non-https URLs", () => {
        expect(isValidRedirect("http://www.notion.so")).toBe(false);
        expect(isValidRedirect("javascript:alert(1)")).toBe(false);
    });

    it("should return true for allowed origins", () => {
        expect(isValidRedirect("https://api.notion.com")).toBe(true);
        expect(isValidRedirect("https://www.notion.so/auth")).toBe(true);
        expect(isValidRedirect("https://mcp.mietevo.de/callback")).toBe(true);
        expect(isValidRedirect("https://mietevo.de/auth/callback")).toBe(true);
        expect(isValidRedirect("https://www.perplexity.ai/rest/connections/oauth_callback")).toBe(true);
    });

    it("should return false for unallowed origins", () => {
        expect(isValidRedirect("https://mietevo.com/oauth/callback")).toBe(false);
        expect(isValidRedirect("https://evil.com")).toBe(false);
        expect(isValidRedirect("https://www.google.com")).toBe(false);
    });
});

describe("isValidSupabaseRedirect", () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    });

    afterEach(() => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    });

    it("should return true for valid supabase origins", () => {
        expect(isValidSupabaseRedirect("https://example.supabase.co/auth/v1/callback")).toBe(true);
    });

    it("should return false for other origins", () => {
        expect(isValidSupabaseRedirect("https://other.supabase.co/auth/v1/callback")).toBe(false);
    });
});

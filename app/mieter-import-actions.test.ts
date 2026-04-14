import { revalidatePath } from "next/cache";
import { posthogLogger } from "@/lib/posthog-logger";

// Mock Supabase Builder
const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  then: jest.fn().mockImplementation(function(resolve: any) {
    return Promise.resolve({ data: [], error: null }).then(resolve);
  }),
};

// Mock Supabase Client (NOT a thenable)
const mockSupabase = {
  from: jest.fn().mockReturnValue(mockQueryBuilder),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } }, error: null }),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
};

// IMPORTANT: Mock MUST be defined after mockSupabase to avoid ReferenceError, 
// though Jest hoists it, the constant must be available in the closure.
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/posthog-logger", () => ({
  posthogLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

// Import actions AFTER mocking
import { 
  searchMailSenders, 
  getMailsBySender, 
  createApplicantsFromMails,
  checkWorkerQueueStatus 
} from "./mieter-import-actions";
import { createClient } from "@/utils/supabase/server";

describe("Mieter Import Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset query builder mocks to return themselves for chaining
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.ilike.mockReturnThis();
    mockQueryBuilder.limit.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
    mockQueryBuilder.not.mockReturnThis();
    mockQueryBuilder.order.mockReturnThis();
    mockQueryBuilder.gte.mockReturnThis();
    mockQueryBuilder.lte.mockReturnThis();
    mockQueryBuilder.insert.mockReturnThis();
    
    // Default leaf resolution for query builder
    mockQueryBuilder.then.mockImplementation(function(resolve: any) {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    });

    // Default auth resolution
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "test-user-id" } }, error: null });

    // Mock environment variables
    process.env.WORKER_URL = "https://test-worker.com";
    process.env.WORKER_AUTH_KEY = "test-key";
  });

  describe("searchMailSenders", () => {
    it("returns empty array if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("Auth error") });
      const result = await searchMailSenders("test");
      expect(result).toEqual([]);
    });

    it("returns empty array if query is too short", async () => {
      const result = await searchMailSenders("t");
      expect(result).toEqual([]);
    });

    it("returns unique senders matching the query", async () => {
      mockQueryBuilder.then.mockImplementationOnce(function(resolve: any) {
        return Promise.resolve({
          data: [
            { absender: "Sender 1 <s1@test.com>" },
            { absender: "Sender 1 <s1@test.com>" },
            { absender: "Sender 2 <s2@test.com>" },
          ],
          error: null
        }).then(resolve);
      });

      const result = await searchMailSenders("Sender");
      
      expect(mockSupabase.from).toHaveBeenCalledWith("Mail_Metadaten");
      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith("absender", "%Sender%");
      expect(result).toEqual(["Sender 1 <s1@test.com>", "Sender 2 <s2@test.com>"]);
    });
  });

  describe("getMailsBySender", () => {
    it("builds correct query with date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");
      
      await getMailsBySender("test@sender.com", startDate, endDate);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("absender", "test@sender.com");
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith("datum_erhalten", startDate.toISOString());
      // Just check that it's the correct day; exact time might vary by timezone in the test runner
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith("datum_erhalten", expect.stringContaining("2024-01-"));
    });
  });

  describe("createApplicantsFromMails", () => {
    it("extracts name and email correctly from absender strings", async () => {
      const mails = [
        { id: "1", absender: '"John Doe" <john@example.com>', dateipfad: "path/1" },
        { id: "2", absender: "jane@example.com", dateipfad: null }
      ];

      mockQueryBuilder.then.mockImplementationOnce(function(resolve: any) {
        return Promise.resolve({ error: null }).then(resolve);
      });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      await createApplicantsFromMails(mails);

      expect(mockSupabase.from).toHaveBeenCalledWith("Mieter");
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          name: "John Doe",
          email: "john@example.com",
          bewerbung_mail_id: "1"
        }),
        expect.objectContaining({
          name: "jane@example.com",
          email: "jane@example.com",
          bewerbung_mail_id: "2"
        })
      ]));
    });

    it("queues mails for AI processing if dateipfad is present", async () => {
      const mails = [
        { id: "1", absender: "test@test.com", dateipfad: "path/1" }
      ];

      mockQueryBuilder.then.mockImplementationOnce(function(resolve: any) {
        return Promise.resolve({ error: null }).then(resolve);
      });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      await createApplicantsFromMails(mails);

      expect(mockSupabase.rpc).toHaveBeenCalledWith("pgmq_send", expect.objectContaining({
        queue_name: "applicant_ai_processing",
        message: expect.objectContaining({
          mail_id: "1"
        })
      }));

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-worker.com/process-queue",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-worker-auth": "test-key"
          })
        })
      );
    });

    it("handles partial success when some chunks fail", async () => {
      const mails = Array(150).fill({ id: "1", absender: "test@test.com" });
      
      // Fail second chunk
      mockQueryBuilder.then
        .mockImplementationOnce((resolve: any) => Promise.resolve({ error: null }).then(resolve))
        .mockImplementationOnce((resolve: any) => Promise.resolve({ error: { message: "Database Error" } }).then(resolve));

      const result = await createApplicantsFromMails(mails);

      expect(result.success).toBe(true);
      expect(result.count).toBe(100);
      expect(result.error).toContain("Import partially failed");
    });
  });

  describe("checkWorkerQueueStatus", () => {
    it("returns hasMore status from worker", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ hasMore: true })
      });

      const result = await checkWorkerQueueStatus("test-user-id");
      expect(result).toEqual({ hasMore: true, success: true });
    });

    it("handles worker errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      });

      const result = await checkWorkerQueueStatus("test-user-id");
      expect(result).toEqual({ hasMore: false, error: "Worker Error" });
    });
  });
});

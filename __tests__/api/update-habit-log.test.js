/**
 * @jest-environment node
 */

// ── Mocks (hoisted before imports) ────────────────────────────────────────────

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("../../lib/auth", () => ({ authOptions: {} }));
jest.mock("../../lib/supabaseServer", () => ({
  supabaseServer: { from: jest.fn() },
  nextAuthIdToUuid: jest.fn((id) => `uuid-${id}`),
}));

// ── Imports ────────────────────────────────────────────────────────────────────

const { PATCH } = require("../../app/api/update-habit-log/route");
const { getServerSession } = require("next-auth");
const { supabaseServer, nextAuthIdToUuid } = require("../../lib/supabaseServer");

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body) {
  return new Request("http://localhost/api/update-habit-log", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockSession(userId = "nextauth-user-1") {
  getServerSession.mockResolvedValue({ user: { id: userId } });
}

/**
 * Build a mock Supabase chain for update().eq().eq().eq().select().single()
 * Returns a spy for the terminal `.single()` call so tests can inspect behavior.
 */
function mockSupabaseUpdate(result) {
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
  supabaseServer.from.mockReturnValue(chain);
  return chain;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PATCH /api/update-habit-log", () => {
  describe("authentication", () => {
    it("returns 401 when there is no session", async () => {
      getServerSession.mockResolvedValue(null);
      const res = await PATCH(makeRequest({ id: "log-1", quantity: 30 }));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/unauthorized/i);
    });

    it("returns 401 when session has no user id", async () => {
      getServerSession.mockResolvedValue({ user: {} });
      const res = await PATCH(makeRequest({ id: "log-1", quantity: 30 }));
      expect(res.status).toBe(401);
    });
  });

  describe("input validation", () => {
    beforeEach(() => mockSession());

    it("returns 400 when id is missing", async () => {
      const res = await PATCH(makeRequest({ quantity: 30 }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/id/i);
    });

    it("returns 400 when id is not a string (number given)", async () => {
      const res = await PATCH(makeRequest({ id: 123, quantity: 30 }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when quantity is missing", async () => {
      const res = await PATCH(makeRequest({ id: "log-1" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/quantity/i);
    });

    it("returns 400 when quantity is not a number (NaN string)", async () => {
      const res = await PATCH(makeRequest({ id: "log-1", quantity: "not-a-number" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when quantity is null", async () => {
      const res = await PATCH(makeRequest({ id: "log-1", quantity: null }));
      expect(res.status).toBe(400);
    });
  });

  describe("successful update", () => {
    beforeEach(() => mockSession());

    it("returns 200 { success: true } when a row is updated", async () => {
      mockSupabaseUpdate({ data: { id: "log-1" }, error: null });
      const res = await PATCH(makeRequest({ id: "log-1", quantity: 30, unit: "minutes" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("calls nextAuthIdToUuid with the session user id", async () => {
      mockSupabaseUpdate({ data: { id: "log-1" }, error: null });
      await PATCH(makeRequest({ id: "log-1", quantity: 30 }));
      expect(nextAuthIdToUuid).toHaveBeenCalledWith("nextauth-user-1");
    });

    it("filters by user_id (ownership check)", async () => {
      const chain = mockSupabaseUpdate({ data: { id: "log-1" }, error: null });
      await PATCH(makeRequest({ id: "log-1", quantity: 30 }));
      // The chain.eq calls include user_id
      const eqCalls = chain.eq.mock.calls;
      const hasUserIdFilter = eqCalls.some(([col, val]) => col === "user_id" && val === "uuid-nextauth-user-1");
      expect(hasUserIdFilter).toBe(true);
    });

    it("filters by is_deleted = false", async () => {
      const chain = mockSupabaseUpdate({ data: { id: "log-1" }, error: null });
      await PATCH(makeRequest({ id: "log-1", quantity: 30 }));
      const eqCalls = chain.eq.mock.calls;
      const hasDeletedFilter = eqCalls.some(([col, val]) => col === "is_deleted" && val === false);
      expect(hasDeletedFilter).toBe(true);
    });

    it("sets is_complete: true in the update payload", async () => {
      const chain = mockSupabaseUpdate({ data: { id: "log-1" }, error: null });
      await PATCH(makeRequest({ id: "log-1", quantity: 5 }));
      const updateArgs = chain.update.mock.calls[0][0];
      expect(updateArgs.is_complete).toBe(true);
      expect(updateArgs.quantity).toBe(5);
    });

    it("converts quantity string to number", async () => {
      const chain = mockSupabaseUpdate({ data: { id: "log-1" }, error: null });
      await PATCH(makeRequest({ id: "log-1", quantity: "42" }));
      const updateArgs = chain.update.mock.calls[0][0];
      expect(updateArgs.quantity).toBe(42);
    });
  });

  describe("not found", () => {
    beforeEach(() => mockSession());

    it("returns 404 when no row matched (data is null, no error)", async () => {
      mockSupabaseUpdate({ data: null, error: null });
      const res = await PATCH(makeRequest({ id: "wrong-id", quantity: 30 }));
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/not found/i);
    });
  });

  describe("database errors", () => {
    beforeEach(() => mockSession());

    it("returns 500 when Supabase returns an error", async () => {
      mockSupabaseUpdate({ data: null, error: { message: "DB blew up" } });
      const res = await PATCH(makeRequest({ id: "log-1", quantity: 30 }));
      expect(res.status).toBe(500);
    });
  });
});

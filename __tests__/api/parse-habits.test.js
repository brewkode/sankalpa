/**
 * @jest-environment node
 */

// ── Mocks (hoisted before imports) ────────────────────────────────────────────

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("../../lib/auth", () => ({ authOptions: {} }));
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readFileSync: jest.fn(() => "You are a habit parser. Return JSON."),
}));
jest.mock("../../lib/supabaseServer", () => ({
  supabaseServer: { from: jest.fn() },
  nextAuthIdToUuid: jest.fn((id) => `uuid-${id}`),
}));

// ── Imports ────────────────────────────────────────────────────────────────────

const { POST } = require("../../app/api/parse-habits/route");
const { getServerSession } = require("next-auth");
const { supabaseServer, nextAuthIdToUuid } = require("../../lib/supabaseServer");

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body) {
  return new Request("http://localhost/api/parse-habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Mock a successful Anthropic response. Injects confidence: 1.0 by default so existing tests stay green. */
function mockAnthropicSuccess(habits) {
  const withConfidence = habits.map((h) => ({ confidence: 1.0, ...h }));
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: JSON.stringify(withConfidence) }],
    }),
  });
}

/** Mock an Anthropic response with explicit confidence values (no defaults injected). */
function mockAnthropicWithConfidence(habits) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: JSON.stringify(habits) }],
    }),
  });
}

function mockSupabaseSuccess(rows) {
  const mockSelect = jest.fn().mockResolvedValue({ data: rows, error: null });
  const mockInsert = jest.fn(() => ({ select: mockSelect }));
  supabaseServer.from.mockReturnValue({ insert: mockInsert });
  return mockSelect;
}

// ── Test setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Defaults: authenticated session, one high-confidence parsed habit, successful DB insert
  getServerSession.mockResolvedValue({ user: { id: "test-user" } });
  mockAnthropicSuccess([{ habit_name: "yoga", quantity: 30, unit: "minutes" }]);
  mockSupabaseSuccess([
    { id: 1, habit_name: "yoga", quantity: 30, unit: "minutes", is_complete: true },
  ]);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/parse-habits", () => {
  describe("authentication", () => {
    it("returns 401 when there is no session", async () => {
      getServerSession.mockResolvedValue(null);
      const res = await POST(makeRequest({ voiceInput: "I did yoga" }));
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ error: "Unauthorized" });
    });

    it("returns 401 when the session has no user.id", async () => {
      getServerSession.mockResolvedValue({ user: {} });
      const res = await POST(makeRequest({ voiceInput: "I did yoga" }));
      expect(res.status).toBe(401);
    });
  });

  describe("input validation", () => {
    it("returns 400 when voiceInput is missing", async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "voiceInput required" });
    });

    it("returns 400 for an empty string voiceInput", async () => {
      const res = await POST(makeRequest({ voiceInput: "" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 for a whitespace-only voiceInput", async () => {
      const res = await POST(makeRequest({ voiceInput: "   " }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when voiceInput is not a string", async () => {
      const res = await POST(makeRequest({ voiceInput: 42 }));
      expect(res.status).toBe(400);
    });
  });

  describe("happy path", () => {
    it("returns 200 with logged habits on a valid voice input", async () => {
      const rows = [
        { id: 1, habit_name: "yoga", quantity: 30, unit: "minutes", is_complete: true },
      ];
      mockSupabaseSuccess(rows);

      const res = await POST(
        makeRequest({ voiceInput: "I did yoga for 30 minutes" })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.logs).toEqual(rows);
    });

    it("sends the voice input to the Anthropic API", async () => {
      await POST(makeRequest({ voiceInput: "drank 3 glasses of water" }));
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("drank 3 glasses of water"),
        })
      );
    });

    it("converts the NextAuth user id to a UUID before inserting", async () => {
      await POST(makeRequest({ voiceInput: "meditated for 10 minutes" }));
      expect(nextAuthIdToUuid).toHaveBeenCalledWith("test-user");
    });

    it("inserts into the habit_logs table", async () => {
      await POST(makeRequest({ voiceInput: "did some yoga" }));
      expect(supabaseServer.from).toHaveBeenCalledWith("habit_logs");
    });

    it("handles multiple habits in a single utterance", async () => {
      mockAnthropicSuccess([
        { habit_name: "yoga", quantity: 30, unit: "minutes" },
        { habit_name: "meditation", quantity: 10, unit: "minutes" },
      ]);
      const rows = [
        { id: 1, habit_name: "yoga", quantity: 30, unit: "minutes", is_complete: true },
        { id: 2, habit_name: "meditation", quantity: 10, unit: "minutes", is_complete: true },
      ];
      mockSupabaseSuccess(rows);

      const res = await POST(
        makeRequest({ voiceInput: "yoga for 30 min and meditated for 10 min" })
      );
      expect(res.status).toBe(200);
      expect((await res.json()).logs).toHaveLength(2);
    });

    it("strips markdown code fences from the Claude response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "text",
              text: '```json\n[{"habit_name":"running","quantity":5,"unit":"km","confidence":0.95}]\n```',
            },
          ],
        }),
      });
      mockSupabaseSuccess([
        { id: 1, habit_name: "running", quantity: 5, unit: "km", is_complete: true },
      ]);

      const res = await POST(makeRequest({ voiceInput: "ran 5km" }));
      expect(res.status).toBe(200);
    });
  });

  describe("confidence scoring", () => {
    it("auto-saves when all habits meet the confidence threshold", async () => {
      mockAnthropicWithConfidence([
        { habit_name: "yoga", quantity: 30, unit: "minutes", confidence: 0.95 },
      ]);
      const rows = [{ id: 1, habit_name: "yoga", quantity: 30, unit: "minutes", is_complete: true }];
      mockSupabaseSuccess(rows);

      const res = await POST(makeRequest({ voiceInput: "I did yoga for 30 minutes" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.logs).toEqual(rows);
      expect(supabaseServer.from).toHaveBeenCalledWith("habit_logs");
    });

    it("returns requiresConfirmation and does NOT insert when confidence is below threshold", async () => {
      mockAnthropicWithConfidence([
        { habit_name: "yoga", quantity: null, unit: null, confidence: 0.45 },
      ]);

      const res = await POST(makeRequest({ voiceInput: "yoga" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.requiresConfirmation).toBe(true);
      expect(data.habits).toHaveLength(1);
      expect(data.habits[0].habit_name).toBe("yoga");
      expect(supabaseServer.from).not.toHaveBeenCalled();
    });

    it("requires confirmation when ANY habit in a multi-habit utterance is low confidence", async () => {
      mockAnthropicWithConfidence([
        { habit_name: "yoga",      quantity: 30,   unit: "minutes", confidence: 0.92 },
        { habit_name: "something", quantity: null, unit: null,       confidence: 0.30 },
      ]);

      const res = await POST(makeRequest({ voiceInput: "yoga and something" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.requiresConfirmation).toBe(true);
      expect(data.habits).toHaveLength(2);
      expect(supabaseServer.from).not.toHaveBeenCalled();
    });

    it("auto-saves when confidence is exactly at the threshold (0.7)", async () => {
      mockAnthropicWithConfidence([
        { habit_name: "yoga", quantity: null, unit: null, confidence: 0.7 },
      ]);
      const rows = [{ id: 1, habit_name: "yoga", quantity: null, unit: null, is_complete: false }];
      mockSupabaseSuccess(rows);

      const res = await POST(makeRequest({ voiceInput: "yoga" }));
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(supabaseServer.from).toHaveBeenCalledWith("habit_logs");
    });

    it("defaults confidence to 1.0 when the field is absent (safe fallback)", async () => {
      // Response without a confidence field — should auto-save, not require confirmation
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            { type: "text", text: JSON.stringify([{ habit_name: "yoga", quantity: null, unit: null }]) },
          ],
        }),
      });
      const rows = [{ id: 1, habit_name: "yoga", quantity: null, unit: null, is_complete: false }];
      mockSupabaseSuccess(rows);

      const res = await POST(makeRequest({ voiceInput: "yoga" }));
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(supabaseServer.from).toHaveBeenCalledWith("habit_logs");
    });
  });

  describe("confirmed save flow", () => {
    it("skips the LLM and saves directly when confirmed: true", async () => {
      const rows = [{ id: 1, habit_name: "yoga", quantity: null, unit: null, is_complete: false }];
      mockSupabaseSuccess(rows);

      const res = await POST(
        makeRequest({
          voiceInput: "yoga",
          confirmed: true,
          habits: [{ habit_name: "yoga", quantity: null, unit: null, confidence: 0.45 }],
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      // Anthropic must NOT have been called
      expect(global.fetch).not.toHaveBeenCalled();
      expect(supabaseServer.from).toHaveBeenCalledWith("habit_logs");
    });

    it("returns 400 when confirmed is true but habits array is empty", async () => {
      const res = await POST(
        makeRequest({ voiceInput: "yoga", confirmed: true, habits: [] })
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "No habits provided for confirmed save" });
    });

    it("returns 400 when confirmed is true but habits is missing", async () => {
      const res = await POST(
        makeRequest({ voiceInput: "yoga", confirmed: true })
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "No habits provided for confirmed save" });
    });
  });

  describe("error handling", () => {
    it("returns 422 when Claude returns an empty habit array", async () => {
      mockAnthropicSuccess([]);
      const res = await POST(makeRequest({ voiceInput: "something unclear" }));
      expect(res.status).toBe(422);
      expect(await res.json()).toMatchObject({
        error: "Could not parse habits from input",
      });
    });

    it("returns 500 when the Anthropic API call fails", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });
      const res = await POST(makeRequest({ voiceInput: "I did yoga" }));
      expect(res.status).toBe(500);
    });

    it("returns 500 when the Supabase insert fails", async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "unique constraint violation", code: "23505" },
      });
      supabaseServer.from.mockReturnValue({
        insert: jest.fn(() => ({ select: mockSelect })),
      });

      const res = await POST(makeRequest({ voiceInput: "I did yoga" }));
      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({ error: "Failed to save logs" });
    });
  });
});

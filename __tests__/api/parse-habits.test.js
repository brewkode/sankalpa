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

function mockAnthropicSuccess(habits) {
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
  // Defaults: authenticated session, one parsed habit, successful DB insert
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
              text: '```json\n[{"habit_name":"running","quantity":5,"unit":"km"}]\n```',
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

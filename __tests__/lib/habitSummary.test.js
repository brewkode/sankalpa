/**
 * @jest-environment node
 */

const { getHabitSummary } = require("../../lib/habitSummary");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a mock Supabase client that returns the given rows. */
function mockSupabase(rows, error = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: rows, error }),
  };
  return { from: jest.fn(() => chain) };
}

const USER_ID = "user-uuid-123";

/** Helper: build a row dated N days before today. */
function rowDaysAgo(habit_name, n, overrides = {}) {
  const d = new Date("2026-02-24T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return {
    habit_name,
    quantity: null,
    unit: null,
    date: d.toISOString().slice(0, 10),
    ...overrides,
  };
}

// ── Test setup ────────────────────────────────────────────────────────────────

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-02-24T12:00:00Z"));
});

afterAll(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getHabitSummary", () => {
  describe("empty / no data", () => {
    it("returns empty summary and empty nudges when there are no rows", async () => {
      const supabase = mockSupabase([]);
      const result = await getHabitSummary(supabase, USER_ID);
      expect(result.summary).toEqual([]);
      expect(result.nudges).toEqual([]);
    });

    it("returns empty summary and empty nudges when rows is null", async () => {
      const supabase = mockSupabase(null);
      const result = await getHabitSummary(supabase, USER_ID);
      expect(result.summary).toEqual([]);
      expect(result.nudges).toEqual([]);
    });
  });

  describe("nudges — qualification rules", () => {
    it("nudges is empty when a habit streak is less than 2", async () => {
      // Only logged yesterday (streak of 1)
      const supabase = mockSupabase([rowDaysAgo("yoga", 1)]);
      const { nudges } = await getHabitSummary(supabase, USER_ID);
      expect(nudges).toEqual([]);
    });

    it("nudges is empty when the at-risk habit was logged today", async () => {
      // Logged today and the past 3 days — streak is fine, no nudge needed
      const rows = [
        rowDaysAgo("yoga", 0),
        rowDaysAgo("yoga", 1),
        rowDaysAgo("yoga", 2),
      ];
      const supabase = mockSupabase(rows);
      const { nudges } = await getHabitSummary(supabase, USER_ID);
      expect(nudges).toEqual([]);
    });

    it("includes a habit in nudges when streak ≥ 2 as-of-yesterday and not logged today", async () => {
      // Logged yesterday and the day before — at-risk streak of 2
      const rows = [rowDaysAgo("yoga", 1), rowDaysAgo("yoga", 2)];
      const supabase = mockSupabase(rows);
      const { nudges } = await getHabitSummary(supabase, USER_ID);
      expect(nudges).toHaveLength(1);
      expect(nudges[0].habit_name).toBe("yoga");
      expect(nudges[0].streak).toBe(2);
    });

    it("each nudge entry has habit_name, habit_name_display, and streak", async () => {
      const rows = [rowDaysAgo("surya namaskar", 1), rowDaysAgo("surya namaskar", 2)];
      const supabase = mockSupabase(rows);
      const { nudges } = await getHabitSummary(supabase, USER_ID);
      expect(nudges[0]).toMatchObject({
        habit_name: "surya namaskar",
        habit_name_display: "Surya Namaskar",
        streak: expect.any(Number),
      });
    });
  });

  describe("nudges — sorting and capping", () => {
    it("sorts nudges by streak descending", async () => {
      // yoga: 3-day streak, meditation: 2-day streak — both not logged today
      const rows = [
        rowDaysAgo("yoga",      1), rowDaysAgo("yoga",      2), rowDaysAgo("yoga",      3),
        rowDaysAgo("meditation",1), rowDaysAgo("meditation", 2),
      ];
      const supabase = mockSupabase(rows);
      const { nudges } = await getHabitSummary(supabase, USER_ID);
      expect(nudges).toHaveLength(2);
      expect(nudges[0].habit_name).toBe("yoga");       // streak 3 first
      expect(nudges[1].habit_name).toBe("meditation"); // streak 2 second
    });

    it("caps nudges at 3 even when more than 3 habits qualify", async () => {
      // 4 habits, each with a 2-day streak, none logged today
      const rows = [
        rowDaysAgo("yoga",      1), rowDaysAgo("yoga",      2),
        rowDaysAgo("meditation",1), rowDaysAgo("meditation", 2),
        rowDaysAgo("running",   1), rowDaysAgo("running",   2),
        rowDaysAgo("water",     1), rowDaysAgo("water",     2),
      ];
      const supabase = mockSupabase(rows);
      const { nudges } = await getHabitSummary(supabase, USER_ID);
      expect(nudges).toHaveLength(3);
    });
  });

  describe("summary (regression)", () => {
    it("returns summary with count, avg_units, and current_streak for habits logged in last 7 days", async () => {
      const rows = [
        rowDaysAgo("yoga", 0, { quantity: 30, unit: "minutes" }),
        rowDaysAgo("yoga", 1, { quantity: 40, unit: "minutes" }),
      ];
      const supabase = mockSupabase(rows);
      const { summary } = await getHabitSummary(supabase, USER_ID);
      expect(summary).toHaveLength(1);
      const yoga = summary[0];
      expect(yoga.habit_name).toBe("yoga");
      expect(yoga.count).toBe(2);
      expect(yoga.avg_units).toBe(35);
      expect(yoga.unit).toBe("minutes");
      expect(yoga.current_streak).toBe(2);
    });

    it("throws when Supabase returns an error", async () => {
      const supabase = mockSupabase(null, { message: "DB error" });
      await expect(getHabitSummary(supabase, USER_ID)).rejects.toMatchObject({
        message: "DB error",
      });
    });
  });
});

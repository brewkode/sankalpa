/**
 * Build a 7-day habit summary plus streak and nudge for a user.
 * Uses habit_logs with is_deleted = false.
 * Fetches last 30 days for streak calculation; 7-day stats for count/avg.
 */

const SUMMARY_DAYS = 7;
const STREAK_LOOKBACK_DAYS = 30;

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId - UUID (e.g. from nextAuthIdToUuid)
 * @returns {Promise<{ summary: Array<object>, nudges: Array<{ habit_name: string, habit_name_display: string, streak: number }> }>}
 */
export async function getHabitSummary(supabase, userId) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const summaryFrom = new Date(now);
  summaryFrom.setDate(summaryFrom.getDate() - SUMMARY_DAYS);
  const streakFrom = new Date(now);
  streakFrom.setDate(streakFrom.getDate() - STREAK_LOOKBACK_DAYS);
  const dateFrom = streakFrom.toISOString().slice(0, 10);

  const { data: rows, error } = await supabase
    .from("habit_logs")
    .select("habit_name, quantity, unit, date")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .gte("date", dateFrom)
    .order("date", { ascending: false });

  if (error) throw error;
  if (!rows?.length) return { summary: [], nudges: [] };

  const byName = new Map();

  for (const row of rows) {
    const name = (row.habit_name || "").trim().toLowerCase();
    if (!name) continue;
    if (!byName.has(name)) {
      byName.set(name, {
        habit_name: name,
        count: 0,
        quantities: [],
        units: [],
        dates: new Set(),
      });
    }
    const e = byName.get(name);
    e.dates.add(String(row.date).slice(0, 10));
    if (row.date >= summaryFrom.toISOString().slice(0, 10)) {
      e.count += 1;
      if (row.quantity != null && row.quantity !== "") {
        e.quantities.push(Number(row.quantity));
      }
      if (row.unit != null && String(row.unit).trim()) {
        e.units.push(String(row.unit).trim().toLowerCase());
      }
    }
  }

  const summary = [];
  const atRiskForNudge = [];

  for (const [, e] of byName) {
    const count = e.count;
    const avg = e.quantities.length
      ? Math.round(e.quantities.reduce((a, b) => a + b, 0) / e.quantities.length)
      : null;
    const unit = mostFrequent(e.units) || (e.units[0] ?? null) || null;

    const loggedToday = e.dates.has(today);
    const currentStreak = loggedToday ? countConsecutiveDaysFrom(e.dates, today) : 0;
    const streakAsOfYesterday = countConsecutiveDaysFrom(e.dates, previousDay(today));

    const habitNameDisplay = toTitleCase(e.habit_name);
    const unitDisplay = formatUnitForDisplay(unit);

    summary.push({
      habit_name: e.habit_name,
      habit_name_display: habitNameDisplay,
      count,
      avg_units: avg,
      unit,
      unit_display: unitDisplay,
      current_streak: currentStreak,
      logged_today: loggedToday,
    });

    if (streakAsOfYesterday >= 2 && !loggedToday) {
      atRiskForNudge.push({
        habit_name: e.habit_name,
        habit_name_display: habitNameDisplay,
        streak: streakAsOfYesterday,
      });
    }
  }

  summary.sort((a, b) => a.habit_name.localeCompare(b.habit_name));

  const summaryLast7 = summary.filter((s) => s.count > 0);

  const nudges = atRiskForNudge
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3);

  return { summary: summaryLast7, nudges };
}

function previousDay(isoDate) {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function countConsecutiveDaysFrom(dateSet, fromDate) {
  let count = 0;
  let d = fromDate;
  while (dateSet.has(d)) {
    count += 1;
    d = previousDay(d);
  }
  return count;
}

function toTitleCase(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const UNIT_DISPLAY_MAP = {
  minutes: "min",
  minute: "min",
  hours: "hr",
  hour: "hr",
  glasses: "glasses",
  glass: "glass",
  cups: "cups",
  cup: "cup",
  reps: "reps",
  rounds: "rounds",
  sets: "sets",
  ml: "ml",
  liters: "L",
  litres: "L",
  km: "km",
  miles: "mi",
  steps: "steps",
};

function formatUnitForDisplay(unit) {
  if (unit == null || unit === "") return null;
  const key = String(unit).trim().toLowerCase();
  return UNIT_DISPLAY_MAP[key] ?? key;
}

function mostFrequent(arr) {
  if (!arr.length) return null;
  const counts = new Map();
  let max = 0;
  let result = null;
  for (const x of arr) {
    const c = (counts.get(x) || 0) + 1;
    counts.set(x, c);
    if (c > max) {
      max = c;
      result = x;
    }
  }
  return result;
}

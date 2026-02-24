import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseServer, nextAuthIdToUuid } from "../../../lib/supabaseServer";

/** Habits with confidence below this threshold trigger a user confirmation step. */
const CONFIDENCE_THRESHOLD = 0.7;

function getHabitSystemPrompt() {
  const path = join(process.cwd(), "app", "api", "parse-habits", "habit_prompt.md");
  return readFileSync(path, "utf-8");
}

/**
 * Parse voice transcript into habits with Anthropic Claude and insert into habit_logs.
 *
 * Normal flow:   POST { voiceInput }
 *   → high confidence → save → { success, logs }
 *   → low confidence  → skip save → { requiresConfirmation, habits }
 *
 * Confirmed flow: POST { voiceInput, confirmed: true, habits }
 *   → skip LLM, save directly → { success, logs }
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const voiceInput = typeof body?.voiceInput === "string" ? body.voiceInput.trim() : "";
    if (!voiceInput) {
      return NextResponse.json({ error: "voiceInput required" }, { status: 400 });
    }

    // ── Confirmed path: client already has parsed habits, skip LLM ────────────
    if (body.confirmed === true) {
      const confirmedHabits = Array.isArray(body.habits) ? body.habits : [];
      if (!confirmedHabits.length) {
        return NextResponse.json(
          { error: "No habits provided for confirmed save" },
          { status: 400 }
        );
      }
      return saveHabits(confirmedHabits, session.user.id, voiceInput);
    }

    // ── Normal parse path ──────────────────────────────────────────────────────
    const habits = await parseHabitsWithClaude(voiceInput);
    if (!habits?.length) {
      return NextResponse.json({ error: "Could not parse habits from input" }, { status: 422 });
    }

    // ── Confidence gate ────────────────────────────────────────────────────────
    const needsConfirmation = habits.some((h) => (h.confidence ?? 1) < CONFIDENCE_THRESHOLD);
    if (needsConfirmation) {
      return NextResponse.json({ requiresConfirmation: true, habits });
    }

    return saveHabits(habits, session.user.id, voiceInput);
  } catch (err) {
    console.error("parse-habits error:", err);
    return NextResponse.json({ error: "Failed to process voice input" }, { status: 500 });
  }
}

/**
 * Insert parsed habits into habit_logs and return the saved rows.
 * @param {Array<{ habit_name, quantity, unit }>} habits
 * @param {string} nextAuthUserId
 * @param {string} voiceInput
 */
async function saveHabits(habits, nextAuthUserId, voiceInput) {
  const userId = nextAuthIdToUuid(nextAuthUserId);
  const today = new Date().toISOString().slice(0, 10);

  const inserts = habits.map(({ habit_name, quantity, unit }) => ({
    user_id: userId,
    habit_name: habit_name.trim(),
    quantity: quantity != null ? Number(quantity) : null,
    unit: unit != null ? String(unit).trim() || null : null,
    date: today,
    voice_input: voiceInput,
    is_complete: quantity != null && quantity !== "",
  }));

  const { data: rows, error } = await supabaseServer
    .from("habit_logs")
    .insert(inserts)
    .select("id, habit_name, quantity, unit, is_complete");

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to save logs" }, { status: 500 });
  }

  return NextResponse.json({ success: true, logs: rows });
}

/**
 * Call Anthropic Claude to extract habits from transcript. Uses habit_prompt.md as system prompt.
 * Returns array of { habit_name, quantity, unit, confidence }.
 */
async function parseHabitsWithClaude(voiceInput) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const systemPrompt = getHabitSystemPrompt();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL_ID || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: voiceInput }],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Anthropic error: ${response.status} ${t}`);
  }

  const data = await response.json();
  const textBlock = data?.content?.find((b) => b.type === "text");
  const content = textBlock?.text?.trim();
  if (!content) throw new Error("Empty Anthropic response");

  const cleaned = content.replace(/^```\w*\n?|\n?```$/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("Claude did not return an array");

  return parsed.map((item) => ({
    habit_name: item.habit_name ?? item.name ?? "",
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    // Default to 1.0 if absent — safe fallback so old responses never trigger the gate
    confidence: typeof item.confidence === "number" ? item.confidence : 1.0,
  }));
}

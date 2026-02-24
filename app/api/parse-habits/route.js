import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseServer, nextAuthIdToUuid } from "../../../lib/supabaseServer";

function getHabitSystemPrompt() {
  const path = join(process.cwd(), "app", "api", "parse-habits", "habit_prompt.md");
  return readFileSync(path, "utf-8");
}

/**
 * Parse voice transcript into habits with Anthropic Claude and insert into habit_logs.
 * POST body: { voiceInput: string }
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

    const habits = await parseHabitsWithClaude(voiceInput);
    if (!habits?.length) {
      return NextResponse.json({ error: "Could not parse habits from input" }, { status: 422 });
    }

    const userId = nextAuthIdToUuid(session.user.id);
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
  } catch (err) {
    console.error("parse-habits error:", err);
    return NextResponse.json({ error: "Failed to process voice input" }, { status: 500 });
  }
}

/**
 * Call Anthropic Claude to extract habits from transcript. Uses habit_prompt.md as system prompt.
 * Returns array of { habit_name, quantity?, unit? } (completed is in prompt but not stored in DB).
 */
async function parseHabitsWithClaude(voiceInput) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const systemPrompt = getHabitSystemPrompt();

  const response = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
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
    }
  );

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
  }));
}

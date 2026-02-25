import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseServer, nextAuthIdToUuid } from "../../../lib/supabaseServer";

/**
 * Update quantity, unit, and is_complete on an existing habit_log.
 * Only updates rows owned by the authenticated user.
 * PATCH body: { id: string, quantity: number, unit?: string | null }
 */
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, quantity, unit } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const quantityNum = Number(quantity);
    if (quantity == null || isNaN(quantityNum)) {
      return NextResponse.json(
        { error: "quantity required and must be a number" },
        { status: 400 }
      );
    }

    const userId = nextAuthIdToUuid(session.user.id);

    const { data, error } = await supabaseServer
      .from("habit_logs")
      .update({
        quantity: quantityNum,
        unit: unit != null ? String(unit).trim() || null : null,
        is_complete: true,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .select("id")
      .single();

    if (error) {
      console.error("update-habit-log error:", error);
      return NextResponse.json({ error: "Failed to update log" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update-habit-log error:", err);
    return NextResponse.json({ error: "Failed to update log" }, { status: 500 });
  }
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
}

/**
 * Server-only Supabase client using the Secret key (privileged access).
 * Use for API routes; enforce user isolation with userId from NextAuth session.
 */
export const supabaseServer = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false },
});

/**
 * Deterministic UUID from NextAuth session.user.id (e.g. Google sub).
 * Used so habit_logs.user_id stays UUID without Supabase Auth.
 */
export function nextAuthIdToUuid(nextAuthId) {
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(String(nextAuthId)).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

-- We use NextAuth, not Supabase Auth, so auth.uid() is never set and RLS policies are inert.
-- Disable RLS; access is enforced in API routes (session + Secret key only).
ALTER TABLE habit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_defaults DISABLE ROW LEVEL SECURITY;

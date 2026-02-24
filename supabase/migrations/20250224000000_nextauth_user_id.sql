-- Allow habit_logs and habit_defaults to use NextAuth user ids (deterministic UUID from session.user.id).
-- Drops FK to auth.users so server can insert with hashed NextAuth id.
ALTER TABLE habit_logs DROP CONSTRAINT IF EXISTS habit_logs_user_id_fkey;
ALTER TABLE habit_defaults DROP CONSTRAINT IF EXISTS habit_defaults_user_id_fkey;

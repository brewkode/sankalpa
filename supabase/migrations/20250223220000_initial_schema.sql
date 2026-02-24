-- Sankalpa initial schema: habit_logs, habit_defaults, RLS, indexes
-- See docs/SANKALPA.md for data model and design decisions.

-- habit_logs: one row per voice log (immutable; edits = soft delete + new row)
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  habit_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,

  date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voice_input TEXT,

  is_complete BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  replaced_by UUID REFERENCES habit_logs(id),

  CONSTRAINT unique_log UNIQUE (user_id, habit_name, logged_at)
);

-- habit_defaults: user's saved defaults per habit (e.g. "yoga → 30 min")
CREATE TABLE habit_defaults (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_name TEXT NOT NULL,
  default_quantity NUMERIC,
  default_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, habit_name)
);

-- RLS: users see only their own data
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own habit_logs"
  ON habit_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users access own habit_defaults"
  ON habit_defaults FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for common queries (per .cursorrules: filter is_deleted = false, sort by date DESC)
CREATE INDEX idx_habit_logs_active
  ON habit_logs (user_id, date DESC)
  WHERE is_deleted = false;

CREATE INDEX idx_habit_logs_incomplete
  ON habit_logs (user_id, is_complete)
  WHERE is_deleted = false AND is_complete = false;

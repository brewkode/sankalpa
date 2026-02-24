# Database setup (Supabase)

## Schema overview

Two tables, both scoped by `user_id` and protected by RLS.

### `habit_logs`

| Column         | Type        | Purpose |
|----------------|-------------|--------|
| `id`           | UUID        | Primary key |
| `user_id`      | UUID        | FK to `auth.users`; owner |
| `habit_name`   | TEXT        | e.g. "yoga", "water" |
| `quantity`     | NUMERIC     | Optional; filled by progressive prompts |
| `unit`         | TEXT        | e.g. "minutes", "glasses" |
| `date`         | DATE        | Log date (default today) |
| `logged_at`    | TIMESTAMPTZ | When the row was created |
| `voice_input`  | TEXT        | Raw transcript for debugging |
| `is_complete`  | BOOLEAN     | true when quantity/unit filled |
| `is_deleted`   | BOOLEAN     | Soft delete (edits = new row, old marked deleted) |
| `replaced_by`  | UUID        | Optional FK to new log when edited |

- **Unique:** `(user_id, habit_name, logged_at)` so duplicate same-second logs are rejected.
- **Indexes:** Active logs by `(user_id, date DESC)` and incomplete logs by `(user_id, is_complete)` (both `WHERE is_deleted = false`).

### `habit_defaults`

| Column            | Type        | Purpose |
|-------------------|-------------|--------|
| `user_id`         | UUID        | FK to `auth.users`; owner |
| `habit_name`      | TEXT        | Habit name |
| `default_quantity`| NUMERIC     | e.g. 30 |
| `default_unit`    | TEXT        | e.g. "minutes" |
| `created_at`      | TIMESTAMPTZ | |
| `updated_at`      | TIMESTAMPTZ | |

- **Primary key:** `(user_id, habit_name)` — one default per user per habit.

### RLS

- **habit_logs:** `auth.uid() = user_id` for ALL.
- **habit_defaults:** `auth.uid() = user_id` for ALL.

So all access is per authenticated user; no cross-user visibility.

---

## Migration script

- **Location:** `supabase/migrations/20250223220000_initial_schema.sql`
- **Contents:** Creates `habit_logs`, `habit_defaults`, RLS policies, and partial indexes.

### Option A: Supabase CLI (recommended)

1. Install: `npm install -g supabase` or [install guide](https://supabase.com/docs/guides/cli).
2. Log in and link the project:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Project ref is in Supabase Dashboard → Project Settings → General.)
3. Apply migrations:
   ```bash
   supabase db push
   ```
   This runs any new files in `supabase/migrations/` that haven’t been applied yet.

### Option B: SQL Editor in Dashboard

1. Open your project in [Supabase Dashboard](https://app.supabase.com) → SQL Editor.
2. Paste the contents of `supabase/migrations/20250223220000_initial_schema.sql`.
3. Run the script once.

Use **Option A** if you want versioned, repeatable migrations (e.g. for new environments or CI). Use **Option B** for a one-off setup on a single project.

---

## After running the migration

- Ensure Google (or your OAuth provider) is enabled in Authentication → Providers so `auth.users` is populated.
- App code should always filter `habit_logs` with `WHERE is_deleted = false` and order by `date DESC` where appropriate (see `.cursorrules`).

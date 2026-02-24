# **SANKALPA - PROJECT SUMMARY**

---

## **1. PROJECT OVERVIEW**

**Name:** Sankalpa (संकल्प) - "intention, resolve, solemn vow"
**Tagline:** "From intention to action"
**Brand Voice:** Zen + sprinkled with motivation

**Problem:** Habit trackers have too much friction. Users quit quickly.
**Solution:** Voice-first tracking. Speak naturally, we handle the rest.

**MVP (7-8 hours):**
✅ Voice input + LLM parsing + Google OAuth + Progressive engagement + Streaks + Edit + Deploy

**Not in MVP:**
❌ Push notifications ❌ Email reminders ❌ Shields ❌ Advanced analytics

---

## **2. TECH STACK**

**Frontend:** Next.js 14 (App Router), JavaScript, Tailwind CSS
**Voice:** Web Speech API
**Backend:** Supabase (Postgres + Auth), Next.js API Routes
**LLM:** Anthropic Claude
**Deploy:** Vercel

---

## **3. ARCHITECTURE**

```
User Browser (Web Speech API)
    ↓
Next.js API Route (/api/parse-habits)
    ↓ Anthropic API key (server-side only)
Claude
    ↓
Frontend → Supabase (Postgres)
```

**Key:** Anthropic key never exposed to browser. All LLM calls server-side.

---

## **4. DATABASE SCHEMA**

```sql
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  habit_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_at TIMESTAMP DEFAULT now(),
  voice_input TEXT,
  
  is_complete BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  replaced_by UUID REFERENCES habit_logs(id),
  
  CONSTRAINT unique_log UNIQUE(user_id, habit_name, logged_at)
);

CREATE TABLE habit_defaults (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_name TEXT NOT NULL,
  default_quantity NUMERIC,
  default_unit TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (user_id, habit_name)
);

-- RLS
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own data" ON habit_logs
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own data" ON habit_defaults
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_logs_active ON habit_logs(user_id, date DESC) 
  WHERE is_deleted = false;
CREATE INDEX idx_logs_incomplete ON habit_logs(user_id, is_complete) 
  WHERE is_deleted = false AND is_complete = false;
```

---

## **5. DATA MODEL**

**Habit Types:**
- Duration: yoga, meditation → minutes
- Volume: water, coffee → glasses, ml
- Count: pushups → reps, rounds

**Multiple logs/day:** ✅ Allowed (different times)
**Streak logic:** Any log for habit that day = streak continues
**Edits:** Mark old `is_deleted=true`, create new log (immutable)

**Progressive Engagement:**
1. "I did yoga" → save with `quantity=null, is_complete=false`
2. Prompt: "How long did you practice?"
3. User: "30 minutes" → update `quantity=30, is_complete=true`
4. Ask: "Should I remember this as your usual practice?"
5. Save to `habit_defaults` if yes
6. Future: Pre-fill "Was it around 30 minutes?"

---

## **6. VOICE & COPY**

**Tone:** Zen (minimal, present-focused, no judgment) + Motivation (simple recognition)

**Emoji:** ✨ (logged) 🔥 (streak) 🎤 (voice) ⏱️ (duration)

**Examples:**
- "✨ Logged."
- "✨ Yoga - 30 minutes. Well done."
- "How long did you practice?"
- "Was it around 30 minutes?"
- "🔥 7 days of yoga. You're building something real."

**Buttons:** [Tell me] [Skip for now] [Yes, remember] [No, it varies]

---

## **7. USER FLOWS**

**First-Time:**
Landing → Google OAuth → Welcome → Voice log → "Remember as usual?" → Done

**Incomplete Log:**
"I did yoga and water" → Save partial → "How long?" → Complete → "How much water?" → Done

**With Defaults:**
"I did yoga" → "Around 30 minutes?" → [Yes] saves 30 / [Different] prompts new

**Edit:**
Logged: Yoga [Edit] → Modal with quantity/unit → Change → Delete old + create new

---

## **8. FUTURE MIGRATION**

**Week 2-3:** PWA (95% reuse)
**Month 2-3:** React Native (70% reuse)
**Month 6+:** Native iOS/Android (30% reuse)

---

## **9. DESIGN DECISIONS**

**LLM vs Regex:** LLM (better accuracy, handles variations, low cost)
**Single vs Separate Tables:** Single `habit_logs` (simpler, faster for MVP)
**All Quantitative:** Yes (richer data, consistent model)
**Immutable Logs:** Soft delete (audit trail, easier debugging)
**Auth:** Google OAuth only (fastest, highest trust)
**Deploy:** Vercel (Next.js native, zero config)
**Language:** JavaScript (faster for 7-8 hour MVP)

---

**END OF SUMMARY**

---
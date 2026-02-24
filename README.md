# Sankalpa

From intention to action. Voice-first habit tracking.

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS
- **Backend:** Supabase (Postgres + Auth)
- **LLM:** Anthropic Claude
- **Deploy:** Vercel

## Setup

1. **Clone and install:**
```bash
   git clone <repo>
   cd sankalpa
   npm install
```

2. **Environment variables:**
```bash
   cp .env.example .env.local
```
   Fill in:
   - Supabase URL + Secret key
   - Anthropic API key

3. **Supabase setup:**
   - Create project at supabase.com
   - Run schema from `/docs/PROJECT_SUMMARY.md`
   - Enable Google OAuth in Auth settings

4. **Run locally:**
```bash
   npm run dev
```
   Open http://localhost:3000

## Project Structure
```
app/
  page.js                    # Main app
  login/page.js              # Login
  api/parse-habits/route.js  # LLM parsing
components/
  VoiceButton.js             # Voice input
  HabitList.js               # Display habits
lib/
  supabase.js                # DB client
  streaks.js                 # Streak logic
```

## Deploy
```bash
# Push to GitHub
git push origin main

# Deploy to Vercel
vercel

# Or connect GitHub repo in Vercel dashboard
```

Add environment variables in Vercel dashboard.

## Voice & Tone

Zen + motivational. Examples:
- "✨ Logged."
- "How long did you practice?"
- "🔥 7 days. You're building something real."

See `/docs/PROJECT_SUMMARY.md` for full guidelines.

## Database Schema

See section 4 in `/docs/PROJECT_SUMMARY.md`

Two tables:
- `habit_logs` - All habit entries
- `habit_defaults` - User's learned defaults

## License

MIT
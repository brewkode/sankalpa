# Sankalpa — Claude Code Instructions

Sankalpa (संकल्प) means "intention to action" in Sanskrit. Voice-first habit tracking app with a zen + motivational tone.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), JavaScript, Tailwind CSS
- **Backend**: Supabase (Postgres), Next.js API Routes
- **LLM**: Anthropic Claude via REST API (server-side only, model: `claude-sonnet-4-6`)
- **Auth**: NextAuth v4 (Google OAuth)
- **Voice**: Web Speech API (browser-native)
- **Deploy**: Vercel

## Project Structure
```
app/
  page.js                          # Home (authenticated)
  login/page.js                    # Login page
  globals.css
  api/
    auth/[...nextauth]/route.js    # NextAuth handler
    parse-habits/
      route.js                     # Voice → LLM → Supabase
      habit_prompt.md              # LLM system prompt
components/
  AppHome.js                       # Main app UI + habit summary
  VoiceButton.js                   # Voice recording + API call
  Landing.js                       # Unauthenticated landing
  LoginButton.js                   # Google OAuth button
  Providers.js                     # NextAuth session provider
lib/
  auth.js                          # NextAuth config (authOptions)
  supabaseServer.js                # Server-side Supabase client
  habitSummary.js                  # Habit aggregation logic
supabase/migrations/               # DB schema (apply via Supabase CLI)
```

## Code Conventions
- ES6+ JavaScript — no TypeScript (MVP)
- `async/await` over promise chains
- Descriptive variable names (`habitName`, not `hn`)
- JSDoc comments on complex functions
- `try/catch` everywhere — log errors with `console.error`
- Small, single-purpose functions

## Next.js Patterns
- App Router (`app/` directory)
- `'use client'` directive required for client components
- Server components are the default
- `NextResponse` for all API responses
- **No `NEXT_PUBLIC_` prefix** on server-only env vars (Supabase, Anthropic, NextAuth)

## Supabase Patterns
- Always use env vars for keys — never hardcode
- Use `supabaseServer` (service role) in API routes only
- Filter soft-deleted rows: `.eq('is_deleted', false)`
- Sort recent logs: `.order('date', { ascending: false })`
- Use `.single()` when expecting one row

## LLM / Anthropic Patterns
- All Claude API calls live in API routes — **never in client components**
- Model: `process.env.ANTHROPIC_MODEL_ID || 'claude-sonnet-4-6'`
- System prompt lives in `habit_prompt.md` (loaded via `readFileSync`)
- Return only valid JSON — no markdown wrappers
- Handle empty/malformed responses gracefully

## Auth Patterns
- Use `getServerSession(authOptions)` in API routes to get the current user
- `session.user.id` is a NextAuth ID — convert to UUID via `nextAuthIdToUuid()` before Supabase queries
- Unauthenticated API requests → `401 Unauthorized`

## Security
- Never commit `.env*` files
- API keys only in server-side code
- Supabase RLS enabled on all tables
- Validate all user input before processing

## Testing
- Framework: Jest + React Testing Library
- Test files: `__tests__/` mirroring the source structure
- Run tests: `npm test`
- Run with coverage: `npm run test:coverage`
- Always run tests before committing significant changes

## Git & Commits
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefixes
- Commit format: **Conventional Commits** — keep messages brief
  - `feat: add habit confirmation flow`
  - `fix: handle empty anthropic response`
  - `chore: update vercel config`
- Always add `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` to commits

## Environment Variables
| Variable | Used by | Purpose |
|---|---|---|
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Server | Supabase service role key |
| `ANTHROPIC_API_KEY` | Server | Claude API access |
| `ANTHROPIC_MODEL_ID` | Server | Optional model override |
| `NEXTAUTH_URL` | Server | Must be production URL on Vercel |
| `NEXTAUTH_SECRET` | Server | JWT signing secret |
| `GOOGLE_CLIENT_ID` | Server | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Server | OAuth client secret |

## UI/UX Guidelines
- Tone: zen + motivational, minimal, no judgment
- Emojis: ✨ (logged) 🔥 (streak) 🎤 (voice) ⏱️ (duration) — no 🎉 🎊
- Button copy: [Tell me] [Skip for now] [Yes, log it] [Discard]
- Confirmations: `"✨ Logged."` `"🔥 7 days of yoga. You're building something real."`
- Keep logging fast — voice-first means minimal taps/clicks

## API Route Template
```javascript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    // ... process
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('route-name error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

## Supabase Query Template
```javascript
const { data, error } = await supabaseServer
  .from('habit_logs')
  .select('*')
  .eq('user_id', userId)
  .eq('is_deleted', false)
  .order('date', { ascending: false })

if (error) throw error
```

## Key Principles
- **Keep it simple** — MVP mindset, no over-engineering
- **Voice-first** — optimise for speed of logging
- **Security first** — RLS, server-side secrets, input validation
- **Zen tone** — every piece of copy should feel calm and encouraging

# Prompt Chain Studio — Week 8

A superadmin-only Next.js tool for creating, editing, deleting, and reordering prompt chains and their steps. Chains generate text media with the OpenAI Responses API, and every run is saved in the existing Week 7 Supabase generation ledger.

## Setup

1. Complete the Week 6 and Week 7 Supabase migrations from the admin app.
2. Copy `.env.example` to `.env.local` and set the Supabase and OpenAI values.
3. Run `npm install`, then `npm run dev`.

Only authenticated users whose `profiles.is_superadmin` value is `TRUE` can access `/studio` or call its server actions. Database RLS repeats that authorization check.

## Assignment coverage

- Prompt chain CRUD
- Prompt chain step CRUD
- Step reordering
- Multi-step text media generation
- Generated-media history by chain
- Google login plus server-side superadmin guard
- Supabase row-level security
- Light, dark, and system theme modes

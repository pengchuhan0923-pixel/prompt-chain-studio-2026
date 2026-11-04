# Prompt Chain Studio — Week 8

A superadmin-only Next.js tool for creating, editing, deleting, and reordering prompt chains and their steps. Chains can generate text with the OpenAI Responses API or an image with the OpenAI Images API, and every run is saved in Supabase.

## Setup

1. Run `supabase/week8_prompt_chains.sql` in the same Supabase project as the existing public/admin apps.
2. Copy `.env.example` to `.env.local` and set the Supabase, Google OAuth, and OpenAI values.
3. Run `npm install`, then `npm run dev`.

Only authenticated users whose `profiles.is_superadmin` value is `TRUE` can access `/studio` or call its server actions. Database RLS repeats that authorization check.

## Assignment coverage

- Prompt chain CRUD
- Prompt chain step CRUD
- Step reordering
- Text and image media generation
- Generated-media history by chain
- Google login plus server-side superadmin guard
- Supabase row-level security
- Light, dark, and system theme modes

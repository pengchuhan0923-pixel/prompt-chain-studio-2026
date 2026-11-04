-- Week 8: Prompt Chain Studio. Run once in the same Supabase project used by
-- the public and admin apps. All access remains protected by is_superadmin().
create extension if not exists pgcrypto;

create table if not exists public.prompt_chains (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.prompt_chain_steps (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.prompt_chains(id) on delete cascade,
  title text not null,
  prompt text not null,
  output_type text not null default 'text' check (output_type in ('text','image')),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique(chain_id, position)
);
create table if not exists public.prompt_chain_runs (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.prompt_chains(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  input_text text,
  output_type text check (output_type in ('text','image')),
  output_text text,
  output_url text,
  status text not null default 'running' check (status in ('running','complete','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.prompt_chains enable row level security;
alter table public.prompt_chain_steps enable row level security;
alter table public.prompt_chain_runs enable row level security;
create policy "Superadmins manage prompt chains" on public.prompt_chains for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
create policy "Superadmins manage prompt steps" on public.prompt_chain_steps for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
create policy "Superadmins manage prompt runs" on public.prompt_chain_runs for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

insert into storage.buckets (id, name, public) values ('chain-media','chain-media',true) on conflict (id) do update set public=true;
create policy "Superadmins upload chain media" on storage.objects for insert to authenticated with check (bucket_id='chain-media' and public.is_superadmin());
create policy "Anyone can view chain media" on storage.objects for select to public using (bucket_id='chain-media');
create policy "Superadmins update chain media" on storage.objects for update to authenticated using (bucket_id='chain-media' and public.is_superadmin()) with check (bucket_id='chain-media' and public.is_superadmin());
create policy "Superadmins delete chain media" on storage.objects for delete to authenticated using (bucket_id='chain-media' and public.is_superadmin());

grant select,insert,update,delete on public.prompt_chains,public.prompt_chain_steps,public.prompt_chain_runs to authenticated;

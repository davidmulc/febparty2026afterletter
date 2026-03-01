create extension if not exists pgcrypto;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  text varchar(280) not null check (char_length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

alter table public.memories enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'memories'
      and policyname = 'Public can read memories'
  ) then
    create policy "Public can read memories"
      on public.memories
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'memories'
      and policyname = 'Public can insert memories'
  ) then
    create policy "Public can insert memories"
      on public.memories
      for insert
      to anon
      with check (char_length(trim(text)) between 1 and 280);
  end if;
end $$;

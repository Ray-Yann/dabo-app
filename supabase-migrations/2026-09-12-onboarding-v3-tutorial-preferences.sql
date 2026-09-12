create table if not exists public.user_tutorial_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tutorial_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_tutorial_preferences enable row level security;

drop policy if exists "Users read own tutorial preference" on public.user_tutorial_preferences;
create policy "Users read own tutorial preference" on public.user_tutorial_preferences for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users insert own tutorial preference" on public.user_tutorial_preferences;
create policy "Users insert own tutorial preference" on public.user_tutorial_preferences for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own tutorial preference" on public.user_tutorial_preferences;
create policy "Users update own tutorial preference" on public.user_tutorial_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on table public.user_tutorial_preferences to authenticated;
revoke truncate, trigger, references on table public.user_tutorial_preferences from anon, authenticated;

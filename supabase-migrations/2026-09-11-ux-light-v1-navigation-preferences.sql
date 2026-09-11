create table if not exists public.user_navigation_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pinned_tabs text[] not null default array['tasks','courses','calendar','finances']::text[],
  updated_at timestamptz not null default now(),
  constraint user_navigation_preferences_four_tabs check (cardinality(pinned_tabs) = 4),
  constraint user_navigation_preferences_allowed_tabs check (pinned_tabs <@ array['tasks','courses','calendar','finances','balance','promos']::text[])
);

alter table public.user_navigation_preferences enable row level security;

drop policy if exists "Users read own navigation" on public.user_navigation_preferences;
create policy "Users read own navigation" on public.user_navigation_preferences
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users insert own navigation" on public.user_navigation_preferences;
create policy "Users insert own navigation" on public.user_navigation_preferences
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users update own navigation" on public.user_navigation_preferences;
create policy "Users update own navigation" on public.user_navigation_preferences
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

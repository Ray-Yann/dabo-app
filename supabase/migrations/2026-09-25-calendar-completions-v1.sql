create table if not exists public.calendar_event_completions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  occurrence_date date not null,
  completed_by uuid not null references public.members(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (event_id, occurrence_date)
);

create index if not exists calendar_event_completions_event_idx
  on public.calendar_event_completions (event_id, occurrence_date);

create index if not exists calendar_event_completions_member_idx
  on public.calendar_event_completions (completed_by);

alter table public.calendar_event_completions enable row level security;

create policy "Calendar completions - lecture autorisee"
on public.calendar_event_completions for select
using (
  exists (
    select 1
    from public.calendar_events
    where calendar_events.id = calendar_event_completions.event_id
      and calendar_events.household_id in (
        select household_id
        from public.members
        where user_id = auth.uid()
          and left_at is null
      )
      and (
        calendar_events.visibility = 'household'
        or calendar_events.private_owner_id in (
          select id
          from public.members
          where user_id = auth.uid()
            and left_at is null
        )
      )
  )
);

create policy "Calendar completions - creation autorisee"
on public.calendar_event_completions for insert
with check (
  completed_by in (
    select id
    from public.members
    where user_id = auth.uid()
      and left_at is null
  )
  and exists (
    select 1
    from public.calendar_events
    where calendar_events.id = calendar_event_completions.event_id
      and calendar_events.household_id = (
        select household_id
        from public.members
        where id = calendar_event_completions.completed_by
          and user_id = auth.uid()
          and left_at is null
      )
      and (
        calendar_events.visibility = 'household'
        or calendar_events.private_owner_id = calendar_event_completions.completed_by
      )
  )
);

create policy "Calendar completions - suppression autorisee"
on public.calendar_event_completions for delete
using (
  exists (
    select 1
    from public.calendar_events
    where calendar_events.id = calendar_event_completions.event_id
      and calendar_events.household_id in (
        select household_id
        from public.members
        where user_id = auth.uid()
          and left_at is null
      )
      and (
        calendar_events.visibility = 'household'
        or calendar_events.private_owner_id in (
          select id
          from public.members
          where user_id = auth.uid()
            and left_at is null
        )
      )
  )
);

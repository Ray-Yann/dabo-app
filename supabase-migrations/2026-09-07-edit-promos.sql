-- DABO — Autorise les membres actifs du foyer à modifier les promotions.

drop policy if exists "Accès foyer - promos update" on public.promos;

create policy "Accès foyer - promos update"
on public.promos for update
using (
  household_id in (
    select household_id from public.members
    where user_id = auth.uid() and left_at is null
  )
)
with check (
  household_id in (
    select household_id from public.members
    where user_id = auth.uid() and left_at is null
  )
);

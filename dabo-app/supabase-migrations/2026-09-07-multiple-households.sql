-- DABO — Un même compte peut appartenir à plusieurs foyers.
-- Migration idempotente : elle ne déplace et ne supprime aucune donnée.

begin;

create or replace function public.is_active_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid()
      and household_id = target_household_id
      and left_at is null
  );
$$;

create or replace function public.is_household_creator(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid()
      and household_id = target_household_id
      and left_at is null
      and role = 'creator'
  );
$$;

grant execute on function public.is_active_household_member(uuid) to authenticated;
grant execute on function public.is_household_creator(uuid) to authenticated;

-- La lecture des adhésions doit fonctionner pour chacun des foyers du compte,
-- sans récursion RLS sur la table members.
drop policy if exists "Voir les membres du foyer" on public.members;
drop policy if exists "Voir les membres des foyers" on public.members;
create policy "Voir les membres des foyers"
on public.members for select to authenticated
using (public.is_active_household_member(household_id));

drop policy if exists "Le créateur modifie le rôle d'un membre" on public.members;
drop policy if exists "Le créateur modifie un membre de son foyer" on public.members;
create policy "Le créateur modifie un membre de son foyer"
on public.members for update to authenticated
using (public.is_household_creator(household_id))
with check (public.is_household_creator(household_id));

drop policy if exists "Le créateur retire un membre" on public.members;
drop policy if exists "Le créateur retire un membre de son foyer" on public.members;
create policy "Le créateur retire un membre de son foyer"
on public.members for delete to authenticated
using (public.is_household_creator(household_id));

-- Les préférences de suggestions restent cloisonnées par foyer.
drop policy if exists "shopping_suggestion_preferences_delete" on public.shopping_suggestion_preferences;
drop policy if exists "shopping_suggestion_preferences_insert" on public.shopping_suggestion_preferences;
drop policy if exists "shopping_suggestion_preferences_select" on public.shopping_suggestion_preferences;
drop policy if exists "shopping_suggestion_preferences_update" on public.shopping_suggestion_preferences;
create policy "shopping_suggestion_preferences_delete" on public.shopping_suggestion_preferences for delete to authenticated using (public.is_active_household_member(household_id));
create policy "shopping_suggestion_preferences_insert" on public.shopping_suggestion_preferences for insert to authenticated with check (public.is_active_household_member(household_id));
create policy "shopping_suggestion_preferences_select" on public.shopping_suggestion_preferences for select to authenticated using (public.is_active_household_member(household_id));
create policy "shopping_suggestion_preferences_update" on public.shopping_suggestion_preferences for update to authenticated using (public.is_active_household_member(household_id)) with check (public.is_active_household_member(household_id));

-- Historique des contributions : accès à chaque foyer dont le compte est membre.
drop policy if exists "Contribution creator can add participants" on public.task_contribution_participants;
create policy "Contribution creator can add participants"
on public.task_contribution_participants for insert to authenticated
with check (exists (
  select 1
  from public.task_contributions tc
  join public.members creator on creator.id = tc.created_by
  join public.members participant on participant.id = task_contribution_participants.member_id
  where tc.id = task_contribution_participants.contribution_id
    and public.is_active_household_member(tc.household_id)
    and creator.user_id = auth.uid()
    and creator.household_id = tc.household_id
    and creator.left_at is null
    and participant.household_id = tc.household_id
    and participant.left_at is null
));

drop policy if exists "Household members can view contribution participants" on public.task_contribution_participants;
create policy "Household members can view contribution participants"
on public.task_contribution_participants for select to authenticated
using (exists (
  select 1 from public.task_contributions tc
  where tc.id = task_contribution_participants.contribution_id
    and public.is_active_household_member(tc.household_id)
));

drop policy if exists "Contribution participants can update contribution" on public.task_contributions;
create policy "Contribution participants can update contribution"
on public.task_contributions for update to authenticated
using (
  public.is_active_household_member(household_id)
  and (
    exists (select 1 from public.members m where m.id = task_contributions.created_by and m.user_id = auth.uid() and m.left_at is null)
    or exists (
      select 1 from public.task_contribution_participants tcp
      join public.members m on m.id = tcp.member_id
      where tcp.contribution_id = task_contributions.id and m.user_id = auth.uid() and m.left_at is null
    )
  )
)
with check (
  public.is_active_household_member(household_id)
  and exists (
    select 1 from public.members m
    where m.id = task_contributions.updated_by
      and m.user_id = auth.uid()
      and m.household_id = task_contributions.household_id
      and m.left_at is null
  )
);

drop policy if exists "Household members can create task contributions" on public.task_contributions;
create policy "Household members can create task contributions"
on public.task_contributions for insert to authenticated
with check (
  public.is_active_household_member(household_id)
  and exists (
    select 1 from public.members m
    where m.id = task_contributions.created_by
      and m.user_id = auth.uid()
      and m.household_id = task_contributions.household_id
      and m.left_at is null
  )
);

drop policy if exists "Household members can view task contributions" on public.task_contributions;
create policy "Household members can view task contributions"
on public.task_contributions for select to authenticated
using (public.is_active_household_member(household_id));

-- Une promo ou information communautaire est rattachée au profil actif envoyé
-- par l'application, et non plus à une adhésion choisie arbitrairement.
create or replace function public.set_community_content_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_member public.members%rowtype;
begin
  select * into current_member
  from public.members
  where id = new.author_id
    and household_id = new.household_id
    and user_id = auth.uid()
    and left_at is null
  limit 1;

  if current_member.id is null then
    raise exception 'Active DABO member required';
  end if;

  new.author_id := current_member.id;
  new.household_id := current_member.household_id;
  new.author_name := current_member.first_name;
  return new;
end;
$$;

commit;

-- DABO Recettes V1: NEW tables, no alteration to existing pantry/shopping tables.
-- Apply only after PostgreSQL multi-user testing. Requires public.members(household_id,user_id,left_at).
create table public.dabo_recipes (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 160),
 instructions text not null default '',
 portions integer not null default 2 check (portions between 1 and 100),
 visibility text not null default 'private' check (visibility in ('private','household','selected','public')),
 primary_household_id uuid references public.households(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint dabo_recipe_home_required check (visibility <> 'household' or primary_household_id is not null)
);
create table public.dabo_recipe_household_grants (
 recipe_id uuid not null references public.dabo_recipes(id) on delete cascade,
 household_id uuid not null references public.households(id) on delete cascade,
 status text not null check (status in ('pending','accepted')),
 requested_at timestamptz not null default now(),
 accepted_at timestamptz,
 accepted_by uuid references auth.users(id) on delete set null,
 primary key(recipe_id,household_id),
 constraint accepted_fields check ((status='pending' and accepted_at is null and accepted_by is null) or (status='accepted' and accepted_at is not null and accepted_by is not null))
);
create table public.dabo_recipe_ingredients (
 id uuid primary key default gen_random_uuid(),
 recipe_id uuid not null references public.dabo_recipes(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 160),
 amount numeric(12,3) not null check (amount > 0),
 unit text not null check (unit in ('piece','g','kg','ml','l')),
 sort_order integer not null default 0
);
create index dabo_recipe_grants_household on public.dabo_recipe_household_grants(household_id,status);
create index dabo_recipe_ingredients_recipe on public.dabo_recipe_ingredients(recipe_id,sort_order);
create index dabo_recipes_owner on public.dabo_recipes(owner_user_id);

create function public.dabo_recipe_can_read(p_recipe uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.dabo_recipes r where r.id=p_recipe and (
   r.owner_user_id=auth.uid() or r.visibility='public' or
   (r.visibility='household' and exists(select 1 from public.members m
      where m.household_id=r.primary_household_id and m.user_id=auth.uid() and m.left_at is null)) or
   (r.visibility='selected' and exists(select 1 from public.dabo_recipe_household_grants g
      join public.members m on m.household_id=g.household_id
      where g.recipe_id=r.id and g.status='accepted' and m.user_id=auth.uid() and m.left_at is null))
  )
 );
$$;

alter table public.dabo_recipes enable row level security;
alter table public.dabo_recipe_household_grants enable row level security;
alter table public.dabo_recipe_ingredients enable row level security;
create policy dabo_recipes_select on public.dabo_recipes for select to authenticated using (public.dabo_recipe_can_read(id));
create policy dabo_recipe_ingredients_select on public.dabo_recipe_ingredients for select to authenticated using (public.dabo_recipe_can_read(recipe_id));
-- Members can see incoming requests; only owners see their outgoing requests.
create policy dabo_recipe_grants_select on public.dabo_recipe_household_grants for select to authenticated
 using (exists(select 1 from public.dabo_recipes r where r.id=recipe_id and r.owner_user_id=auth.uid())
 or exists(select 1 from public.members m where m.household_id=household_id and m.user_id=auth.uid() and m.left_at is null));

create function public.dabo_recipe_create(p_title text,p_instructions text default '',p_portions integer default 2)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 insert into public.dabo_recipes(owner_user_id,title,instructions,portions)
 values(auth.uid(),btrim(p_title),coalesce(p_instructions,''),p_portions) returning id into v_id;
 return v_id;
end $$;

create function public.dabo_recipe_update(p_recipe uuid,p_title text,p_instructions text,p_portions integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
 update public.dabo_recipes set title=btrim(p_title),instructions=coalesce(p_instructions,''),portions=p_portions,updated_at=now()
 where id=p_recipe and owner_user_id=auth.uid();
 if not found then raise exception 'Recipe not found or not owned'; end if;
end $$;

create function public.dabo_recipe_replace_ingredients(p_recipe uuid,p_ingredients jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_item jsonb; v_pos integer := 0;
begin
 if not exists(select 1 from public.dabo_recipes where id=p_recipe and owner_user_id=auth.uid() for update) then
  raise exception 'Recipe not found or not owned';
 end if;
 if jsonb_typeof(p_ingredients) is distinct from 'array' or jsonb_array_length(p_ingredients)>100 then
  raise exception 'Invalid ingredient array';
 end if;
 -- Validate and insert in a single database transaction. An error rolls back the delete.
 delete from public.dabo_recipe_ingredients where recipe_id=p_recipe;
 for v_item in select value from jsonb_array_elements(p_ingredients) loop
  if jsonb_typeof(v_item) <> 'object' then raise exception 'Invalid ingredient'; end if;
  insert into public.dabo_recipe_ingredients(recipe_id,name,amount,unit,sort_order)
  values(p_recipe,btrim(v_item->>'name'),(v_item->>'amount')::numeric,v_item->>'unit',v_pos);
  v_pos := v_pos+1;
 end loop;
 update public.dabo_recipes set updated_at=now() where id=p_recipe;
end $$;

create function public.dabo_recipe_set_visibility(p_recipe uuid,p_visibility text,p_household uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_visibility not in ('private','household','selected','public') or p_visibility is null then raise exception 'Invalid visibility'; end if;
 if not exists(select 1 from public.dabo_recipes where id=p_recipe and owner_user_id=auth.uid() for update) then
  raise exception 'Recipe not found or not owned';
 end if;
 if p_visibility='household' and not exists(select 1 from public.members
   where household_id=p_household and user_id=auth.uid() and left_at is null) then
  raise exception 'Owner is not a member of the selected household';
 end if;
 -- Every mode change clears stale grants, including pending invitations.
 delete from public.dabo_recipe_household_grants where recipe_id=p_recipe;
 update public.dabo_recipes set visibility=p_visibility,
  primary_household_id=case when p_visibility='household' then p_household else null end,
  updated_at=now() where id=p_recipe;
end $$;

create function public.dabo_recipe_invite_household(p_recipe uuid,p_household uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
 select owner_user_id into v_owner from public.dabo_recipes where id=p_recipe and visibility='selected' for update;
 if v_owner is distinct from auth.uid() or auth.uid() is null then raise exception 'Not authorized'; end if;
 if not exists(select 1 from public.households where id=p_household) then raise exception 'Unknown household'; end if;
 -- Never auto-accept an external household. A member must accept explicitly.
 insert into public.dabo_recipe_household_grants(recipe_id,household_id,status)
 values(p_recipe,p_household,'pending')
 on conflict(recipe_id,household_id) do nothing;
end $$;

create function public.dabo_recipe_accept_household(p_recipe uuid,p_household uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.members
   where household_id=p_household and user_id=auth.uid() and left_at is null) then
  raise exception 'Not a member of this household';
 end if;
 update public.dabo_recipe_household_grants g set status='accepted',accepted_at=now(),accepted_by=auth.uid()
 where g.recipe_id=p_recipe and g.household_id=p_household and g.status='pending'
 and exists(select 1 from public.dabo_recipes r where r.id=p_recipe and r.visibility='selected');
 if not found then raise exception 'No pending invitation'; end if;
end $$;

create function public.dabo_recipe_revoke_household(p_recipe uuid,p_household uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.dabo_recipes where id=p_recipe and owner_user_id=auth.uid() for update) then
  raise exception 'Recipe not found or not owned';
 end if;
 delete from public.dabo_recipe_household_grants where recipe_id=p_recipe and household_id=p_household;
end $$;

create function public.dabo_recipe_delete(p_recipe uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 delete from public.dabo_recipes where id=p_recipe and owner_user_id=auth.uid();
 if not found then raise exception 'Recipe not found or not owned'; end if;
end $$;

-- Harden privileged RPCs against public/anonymous execution and direct table writes.
revoke all on public.dabo_recipes,public.dabo_recipe_household_grants,public.dabo_recipe_ingredients from public,anon,authenticated;
grant select on public.dabo_recipes,public.dabo_recipe_household_grants,public.dabo_recipe_ingredients to authenticated;
revoke all on function public.dabo_recipe_can_read(uuid) from public,anon;
grant execute on function public.dabo_recipe_can_read(uuid) to authenticated;
revoke all on function public.dabo_recipe_create(text,text,integer),public.dabo_recipe_update(uuid,text,text,integer),
 public.dabo_recipe_replace_ingredients(uuid,jsonb),public.dabo_recipe_set_visibility(uuid,text,uuid),
 public.dabo_recipe_invite_household(uuid,uuid),public.dabo_recipe_accept_household(uuid,uuid),
 public.dabo_recipe_revoke_household(uuid,uuid),public.dabo_recipe_delete(uuid) from public,anon;
grant execute on function public.dabo_recipe_create(text,text,integer),public.dabo_recipe_update(uuid,text,text,integer),
 public.dabo_recipe_replace_ingredients(uuid,jsonb),public.dabo_recipe_set_visibility(uuid,text,uuid),
 public.dabo_recipe_invite_household(uuid,uuid),public.dabo_recipe_accept_household(uuid,uuid),
 public.dabo_recipe_revoke_household(uuid,uuid),public.dabo_recipe_delete(uuid) to authenticated;

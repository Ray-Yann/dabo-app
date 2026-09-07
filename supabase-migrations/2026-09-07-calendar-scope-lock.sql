-- DABO — Empêche le changement de portée d'un événement après sa création.
-- Un événement peut être modifié, mais il ne peut pas passer de « foyer » à
-- « personnel » (ou inversement), ni changer de propriétaire privé.

create or replace function public.prevent_calendar_event_scope_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.visibility is distinct from old.visibility
     or new.private_owner_id is distinct from old.private_owner_id then
    raise exception 'La portée d''un événement ne peut pas être modifiée';
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_events_lock_scope on public.calendar_events;

create trigger calendar_events_lock_scope
before update on public.calendar_events
for each row
execute function public.prevent_calendar_event_scope_change();

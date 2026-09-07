-- DABO — Schéma Supabase de référence
-- Instantané reconstruit depuis la base de production le 2026-09-07.
--
-- IMPORTANT : ce fichier sert à documenter ou initialiser un NOUVEAU projet.
-- Ne pas l'exécuter sur la base DABO actuelle : utiliser uniquement les fichiers
-- datés du dossier supabase-migrations pour faire évoluer une base existante.

begin;

create extension if not exists "pgcrypto";

create table "public"."calendar_events" (
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "event_date" date NOT NULL,
  "household_id" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "private_owner_id" uuid,
  "recurring" boolean NOT NULL DEFAULT true,
  "reminder_days_before" integer NOT NULL DEFAULT 7,
  "title" text NOT NULL,
  "visibility" text NOT NULL DEFAULT 'household'::text
);

create table "public"."comments" (
  "author_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "household_id" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "shopping_item_id" uuid,
  "task_id" uuid,
  "text" text NOT NULL
);

create table "public"."households" (
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "equity_score_enabled" boolean NOT NULL DEFAULT true,
  "household_type" text NOT NULL DEFAULT 'couple'::text,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "invite_code" text NOT NULL,
  "name" text NOT NULL
);

create table "public"."members" (
  "archived_avatar_color" text,
  "avatar_color" text,
  "avatar_emoji" text,
  "avatar_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "dark_mode" boolean NOT NULL DEFAULT false,
  "first_name" text NOT NULL,
  "household_id" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "language" text NOT NULL DEFAULT 'fr'::text,
  "left_at" timestamptz,
  "role" text NOT NULL DEFAULT 'member'::text,
  "rotation_order" integer NOT NULL DEFAULT 0,
  "user_id" uuid
);

create table "public"."promos" (
  "author_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "household_id" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "note" text,
  "product_name" text NOT NULL,
  "store_name" text NOT NULL
);

create table "public"."push_subscriptions" (
  "auth" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "endpoint" text NOT NULL,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "member_id" uuid NOT NULL,
  "p256dh" text NOT NULL
);

create table "public"."routines" (
  "active" boolean NOT NULL DEFAULT true,
  "anchor_date" date,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "custom_days" integer[],
  "duration_key" text,
  "effort_level" text,
  "ended_at" timestamptz,
  "frequency" text NOT NULL,
  "household_id" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "last_assigned_member" uuid,
  "name" text NOT NULL,
  "weight_points" integer NOT NULL DEFAULT 15
);

create table "public"."shopping_items" (
  "assigned_to" uuid,
  "bought_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "dabo_suggestion_product_key" text,
  "due_date" date,
  "household_id" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "quantity" text,
  "status" text NOT NULL DEFAULT 'to_buy'::text,
  "urgent" boolean NOT NULL DEFAULT false
);

create table "public"."shopping_suggestion_preferences" (
  "accepted_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "disabled" boolean NOT NULL DEFAULT false,
  "dismiss_count" integer NOT NULL DEFAULT 0,
  "household_id" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "last_accepted_at" timestamptz,
  "last_dismissed_at" timestamptz,
  "last_label" text,
  "last_suggested_at" timestamptz,
  "product_key" text NOT NULL,
  "removed_without_purchase_count" integer NOT NULL DEFAULT 0,
  "snoozed_until" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

create table "public"."task_contribution_participants" (
  "contribution_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "member_id" uuid NOT NULL,
  "share_weight" numeric NOT NULL DEFAULT 1
);

create table "public"."task_contributions" (
  "cancelled_at" timestamptz,
  "completed_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "duration_key" text,
  "effort_level" text,
  "hidden_from_task_history" boolean NOT NULL DEFAULT false,
  "household_id" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "performer_status" text NOT NULL DEFAULT 'unknown'::text,
  "task_id" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "weight_points" integer NOT NULL
);

create table "public"."tasks" (
  "assigned_to" uuid,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "due_date" date,
  "duration_key" text,
  "effort_level" text,
  "household_id" uuid NOT NULL,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "routine_id" uuid,
  "status" text NOT NULL DEFAULT 'pending'::text,
  "urgent" boolean NOT NULL DEFAULT false,
  "weight_points" integer NOT NULL DEFAULT 15
);

-- Index indépendants des contraintes

CREATE INDEX calendar_events_household_visibility_idx ON public.calendar_events USING btree (household_id, visibility, event_date);
CREATE INDEX calendar_events_private_owner_idx ON public.calendar_events USING btree (private_owner_id, event_date) WHERE (visibility = 'personal'::text);
CREATE INDEX shopping_suggestion_preferences_household_idx ON public.shopping_suggestion_preferences USING btree (household_id);
CREATE UNIQUE INDEX tasks_id_household_id_unique ON public.tasks USING btree (id, household_id);
CREATE UNIQUE INDEX tasks_one_pending_per_routine_due_date ON public.tasks USING btree (routine_id, due_date) WHERE ((routine_id IS NOT NULL) AND (due_date IS NOT NULL) AND (status = 'pending'::text));

-- Contraintes

alter table "public"."calendar_events" add constraint "calendar_events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;
alter table "public"."calendar_events" add constraint "calendar_events_household_id_fkey" FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
alter table "public"."calendar_events" add constraint "calendar_events_personal_owner_check" CHECK (visibility = 'household'::text AND private_owner_id IS NULL OR visibility = 'personal'::text AND private_owner_id IS NOT NULL);
alter table "public"."calendar_events" add constraint "calendar_events_pkey" PRIMARY KEY (id);
alter table "public"."calendar_events" add constraint "calendar_events_private_owner_id_fkey" FOREIGN KEY (private_owner_id) REFERENCES members(id) ON DELETE CASCADE;
alter table "public"."calendar_events" add constraint "calendar_events_visibility_check" CHECK (visibility = ANY (ARRAY['household'::text, 'personal'::text]));
alter table "public"."comments" add constraint "comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES members(id) ON DELETE CASCADE;
alter table "public"."comments" add constraint "comments_household_id_fkey" FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY (id);
alter table "public"."comments" add constraint "comments_shopping_item_id_fkey" FOREIGN KEY (shopping_item_id) REFERENCES shopping_items(id) ON DELETE CASCADE;
alter table "public"."comments" add constraint "comments_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
alter table "public"."comments" add constraint "one_target_only" CHECK (task_id IS NOT NULL AND shopping_item_id IS NULL OR task_id IS NULL AND shopping_item_id IS NOT NULL);
alter table "public"."households" add constraint "households_household_type_check" CHECK (household_type = ANY (ARRAY['couple'::text, 'coloc'::text, 'famille'::text]));
alter table "public"."households" add constraint "households_invite_code_key" UNIQUE (invite_code);
alter table "public"."households" add constraint "households_pkey" PRIMARY KEY (id);
alter table "public"."members" add constraint "members_household_id_fkey" FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
alter table "public"."members" add constraint "members_household_id_user_id_key" UNIQUE (household_id, user_id);
alter table "public"."members" add constraint "members_language_check" CHECK (language = ANY (ARRAY['fr'::text, 'nl'::text, 'en'::text]));
alter table "public"."members" add constraint "members_pkey" PRIMARY KEY (id);
alter table "public"."members" add constraint "members_role_check" CHECK (role = ANY (ARRAY['creator'::text, 'member'::text]));
alter table "public"."members" add constraint "members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table "public"."promos" add constraint "promos_author_id_fkey" FOREIGN KEY (author_id) REFERENCES members(id) ON DELETE CASCADE;
alter table "public"."promos" add constraint "promos_household_id_fkey" FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
alter table "public"."promos" add constraint "promos_pkey" PRIMARY KEY (id);
alter table "public"."push_subscriptions" add constraint "push_subscriptions_endpoint_key" UNIQUE (endpoint);
alter table "public"."push_subscriptions" add constraint "push_subscriptions_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
alter table "public"."push_subscriptions" add constraint "push_subscriptions_pkey" PRIMARY KEY (id);
alter table "public"."routines" add constraint "routines_custom_days_check" CHECK (frequency <> 'custom'::text AND custom_days IS NULL OR frequency = 'custom'::text AND custom_days IS NOT NULL AND cardinality(custom_days) > 0 AND custom_days <@ ARRAY[0, 1, 2, 3, 4, 5, 6]);
alter table "public"."routines" add constraint "routines_frequency_check" CHECK (frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text, 'yearly'::text, 'custom'::text]));
alter table "public"."routines" add constraint "routines_household_id_fkey" FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
alter table "public"."routines" add constraint "routines_last_assigned_member_fkey" FOREIGN KEY (last_assigned_member) REFERENCES members(id) ON DELETE SET NULL;
alter table "public"."routines" add constraint "routines_pkey" PRIMARY KEY (id);
alter table "public"."shopping_items" add constraint "shopping_items_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES members(id) ON DELETE SET NULL;
alter table "public"."shopping_items" add constraint "shopping_items_household_id_fkey" FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
alter table "public"."shopping_items" add constraint "shopping_items_pkey" PRIMARY KEY (id);
alter table "public"."shopping_items" add constraint "shopping_items_status_check" CHECK (status = ANY (ARRAY['to_buy'::text, 'bought'::text]));
alter table "public"."shopping_suggestion_preferences" add constraint "shopping_suggestion_preferen_removed_without_purchase_cou_check" CHECK (removed_without_purchase_count >= 0);
alter table "public"."shopping_suggestion_preferences" add constraint "shopping_suggestion_preferences_accepted_count_check" CHECK (accepted_count >= 0);
alter table "public"."shopping_suggestion_preferences" add constraint "shopping_suggestion_preferences_dismiss_count_check" CHECK (dismiss_count >= 0);
alter table "public"."shopping_suggestion_preferences" add constraint "shopping_suggestion_preferences_household_id_fkey" FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
alter table "public"."shopping_suggestion_preferences" add constraint "shopping_suggestion_preferences_household_id_product_key_key" UNIQUE (household_id, product_key);
alter table "public"."shopping_suggestion_preferences" add constraint "shopping_suggestion_preferences_pkey" PRIMARY KEY (id);
alter table "public"."task_contribution_participants" add constraint "task_contribution_participant_unique" UNIQUE (contribution_id, member_id);
alter table "public"."task_contribution_participants" add constraint "task_contribution_participants_contribution_id_fkey" FOREIGN KEY (contribution_id) REFERENCES task_contributions(id) ON DELETE CASCADE;
alter table "public"."task_contribution_participants" add constraint "task_contribution_participants_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT;
alter table "public"."task_contribution_participants" add constraint "task_contribution_participants_pkey" PRIMARY KEY (id);
alter table "public"."task_contribution_participants" add constraint "task_contribution_participants_share_weight_check" CHECK (share_weight > 0::numeric);
alter table "public"."task_contributions" add constraint "task_contributions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE RESTRICT;
alter table "public"."task_contributions" add constraint "task_contributions_household_id_fkey" FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
alter table "public"."task_contributions" add constraint "task_contributions_performer_status_check" CHECK (performer_status = ANY (ARRAY['confirmed'::text, 'unknown'::text]));
alter table "public"."task_contributions" add constraint "task_contributions_pkey" PRIMARY KEY (id);
alter table "public"."task_contributions" add constraint "task_contributions_task_household_fkey" FOREIGN KEY (task_id, household_id) REFERENCES tasks(id, household_id) ON DELETE RESTRICT;
alter table "public"."task_contributions" add constraint "task_contributions_task_unique" UNIQUE (task_id);
alter table "public"."task_contributions" add constraint "task_contributions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES members(id) ON DELETE RESTRICT;
alter table "public"."tasks" add constraint "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES members(id) ON DELETE SET NULL;
alter table "public"."tasks" add constraint "tasks_household_id_fkey" FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY (id);
alter table "public"."tasks" add constraint "tasks_routine_id_fkey" FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE SET NULL;
alter table "public"."tasks" add constraint "tasks_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'done'::text]));

-- Fonctions

CREATE OR REPLACE FUNCTION public.can_edit_task_contribution(p_contribution_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.task_contributions tc
    JOIN public.members current_member
      ON current_member.user_id = auth.uid()
     AND current_member.household_id = tc.household_id
     AND current_member.left_at IS NULL
    WHERE tc.id = p_contribution_id
      AND (
        tc.created_by = current_member.id
        OR EXISTS (
          SELECT 1
          FROM public.task_contribution_participants tcp
          WHERE tcp.contribution_id = tc.id
            AND tcp.member_id = current_member.id
        )
      )
  );
$function$

CREATE OR REPLACE FUNCTION public.confirm_historical_task_contribution(p_contribution_id uuid, p_member_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contribution public.task_contributions%ROWTYPE;
  v_current_member_id uuid;
  v_selected_count integer;
  v_valid_count integer;
BEGIN
  SELECT *
  INTO v_contribution
  FROM public.task_contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution not found';
  END IF;

  IF v_contribution.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cancelled contribution cannot be confirmed';
  END IF;

  IF v_contribution.performer_status <> 'unknown' THEN
    RAISE EXCEPTION 'Contribution is already confirmed';
  END IF;

  SELECT m.id
  INTO v_current_member_id
  FROM public.members m
  WHERE m.user_id = auth.uid()
    AND m.household_id = v_contribution.household_id
    AND m.left_at IS NULL
  LIMIT 1;

  IF v_current_member_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_member_ids IS NULL OR cardinality(p_member_ids) = 0 THEN
    RAISE EXCEPTION 'At least one performer is required';
  END IF;

  SELECT COUNT(DISTINCT member_id)
  INTO v_selected_count
  FROM unnest(p_member_ids) AS member_id;

  IF v_selected_count <> cardinality(p_member_ids) THEN
    RAISE EXCEPTION 'Duplicate performers are not allowed';
  END IF;

  SELECT COUNT(*)
  INTO v_valid_count
  FROM public.members m
  WHERE m.id = ANY(p_member_ids)
    AND m.household_id = v_contribution.household_id
    AND m.left_at IS NULL;

  IF v_valid_count <> v_selected_count THEN
    RAISE EXCEPTION 'Invalid household performer';
  END IF;

  DELETE FROM public.task_contribution_participants
  WHERE contribution_id = p_contribution_id;

  INSERT INTO public.task_contribution_participants (
    contribution_id,
    member_id,
    share_weight
  )
  SELECT
    p_contribution_id,
    member_id,
    1
  FROM unnest(p_member_ids) AS member_id;

  UPDATE public.task_contributions
  SET
    performer_status = 'confirmed',
    updated_by = v_current_member_id,
    updated_at = now()
  WHERE id = p_contribution_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_my_household_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select household_id from members where user_id = auth.uid() limit 1;
$function$

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select role from members where user_id = auth.uid() limit 1;
$function$

CREATE OR REPLACE FUNCTION public.manage_task_contribution_history(p_contribution_id uuid, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contribution public.task_contributions%ROWTYPE;
  v_current_member_id uuid;
BEGIN
  IF p_action NOT IN ('hide', 'cancel') THEN
    RAISE EXCEPTION 'Unsupported history action';
  END IF;

  SELECT *
  INTO v_contribution
  FROM public.task_contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution not found';
  END IF;

  SELECT m.id
  INTO v_current_member_id
  FROM public.members m
  WHERE m.user_id = auth.uid()
    AND m.household_id = v_contribution.household_id
    AND m.left_at IS NULL
  LIMIT 1;

  IF v_current_member_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_action = 'hide' THEN
    UPDATE public.task_contributions
    SET
      hidden_from_task_history = true,
      updated_by = v_current_member_id,
      updated_at = now()
    WHERE id = p_contribution_id;

  ELSIF p_action = 'cancel' THEN

    IF v_contribution.performer_status = 'confirmed'
       AND NOT public.can_edit_task_contribution(p_contribution_id) THEN
      RAISE EXCEPTION 'Only a contribution participant can cancel this contribution';
    END IF;

    UPDATE public.task_contributions
    SET
      cancelled_at = COALESCE(cancelled_at, now()),
      updated_by = v_current_member_id,
      updated_at = now()
    WHERE id = p_contribution_id;
  END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.prevent_calendar_event_scope_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.visibility is distinct from old.visibility
     or new.private_owner_id is distinct from old.private_owner_id then
    raise exception 'La portée d''un événement ne peut pas être modifiée';
  end if;
  return new;
end;
$function$

-- Sécurité par ligne

alter table "public"."calendar_events" enable row level security;
alter table "public"."comments" enable row level security;
alter table "public"."households" enable row level security;
alter table "public"."members" enable row level security;
alter table "public"."promos" enable row level security;
alter table "public"."push_subscriptions" enable row level security;
alter table "public"."routines" enable row level security;
alter table "public"."shopping_items" enable row level security;
alter table "public"."shopping_suggestion_preferences" enable row level security;
alter table "public"."task_contribution_participants" enable row level security;
alter table "public"."task_contributions" enable row level security;
alter table "public"."tasks" enable row level security;

create policy "Calendrier - creation autorisee" on "public"."calendar_events" for insert to public
with check ((household_id IN ( SELECT members.household_id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.left_at IS NULL)))) AND (((visibility = 'household'::text) AND (private_owner_id IS NULL)) OR ((visibility = 'personal'::text) AND (private_owner_id IN ( SELECT members.id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.household_id = calendar_events.household_id) AND (members.left_at IS NULL)))))))
;

create policy "Calendrier - lecture autorisee" on "public"."calendar_events" for select to public
using ((household_id IN ( SELECT members.household_id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.left_at IS NULL)))) AND ((visibility = 'household'::text) OR (private_owner_id IN ( SELECT members.id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.left_at IS NULL))))))
;

create policy "Calendrier - modification autorisee" on "public"."calendar_events" for update to public
using ((household_id IN ( SELECT members.household_id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.left_at IS NULL)))) AND ((visibility = 'household'::text) OR (private_owner_id IN ( SELECT members.id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.left_at IS NULL))))))
with check ((household_id IN ( SELECT members.household_id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.left_at IS NULL)))) AND (((visibility = 'household'::text) AND (private_owner_id IS NULL)) OR ((visibility = 'personal'::text) AND (private_owner_id IN ( SELECT members.id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.household_id = calendar_events.household_id) AND (members.left_at IS NULL)))))))
;

create policy "Calendrier - suppression autorisee" on "public"."calendar_events" for delete to public
using ((household_id IN ( SELECT members.household_id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.left_at IS NULL)))) AND ((visibility = 'household'::text) OR (private_owner_id IN ( SELECT members.id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.left_at IS NULL))))))
;

create policy "Accès foyer - comments insert" on "public"."comments" for insert to public
with check (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - comments select" on "public"."comments" for select to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Modifier son propre commentaire" on "public"."comments" for update to public
using (author_id IN ( SELECT members.id
   FROM members
  WHERE (members.user_id = auth.uid())))
with check (author_id IN ( SELECT members.id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Supprimer son propre commentaire" on "public"."comments" for delete to public
using (author_id IN ( SELECT members.id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Créer un foyer" on "public"."households" for insert to public
with check (auth.uid() IS NOT NULL)
;

create policy "Modifier son foyer" on "public"."households" for update to public
using (id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Voir un foyer (connecté)" on "public"."households" for select to public
using (auth.uid() IS NOT NULL)
;

create policy "Le créateur modifie le rôle d'un membre" on "public"."members" for update to public
using ((household_id = get_my_household_id()) AND (get_my_role() = 'creator'::text))
with check ((household_id = get_my_household_id()) AND (get_my_role() = 'creator'::text))
;

create policy "Le créateur retire un membre" on "public"."members" for delete to public
using ((household_id = get_my_household_id()) AND (get_my_role() = 'creator'::text))
;

create policy "Modifier son propre profil" on "public"."members" for update to public
using (user_id = auth.uid())
with check (user_id = auth.uid())
;

create policy "Quitter un foyer" on "public"."members" for delete to public
using (user_id = auth.uid())
;

create policy "Rejoindre un foyer" on "public"."members" for insert to public
with check (user_id = auth.uid())
;

create policy "Voir les membres du foyer" on "public"."members" for select to public
using (household_id = get_my_household_id())
;

create policy "Accès foyer - promos delete" on "public"."promos" for delete to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - promos insert" on "public"."promos" for insert to public
with check (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - promos select" on "public"."promos" for select to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - promos update" on "public"."promos" for update to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.left_at IS NULL))))
with check (household_id IN ( SELECT members.household_id
   FROM members
  WHERE ((members.user_id = auth.uid()) AND (members.left_at IS NULL))))
;

create policy "Gérer son propre abonnement" on "public"."push_subscriptions" for all to public
using (member_id IN ( SELECT members.id
   FROM members
  WHERE (members.user_id = auth.uid())))
with check (member_id IN ( SELECT members.id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - routines delete" on "public"."routines" for delete to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - routines insert" on "public"."routines" for insert to public
with check (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - routines select" on "public"."routines" for select to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - routines update" on "public"."routines" for update to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - shopping delete" on "public"."shopping_items" for delete to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - shopping insert" on "public"."shopping_items" for insert to public
with check (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - shopping select" on "public"."shopping_items" for select to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - shopping update" on "public"."shopping_items" for update to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "shopping_suggestion_preferences_delete" on "public"."shopping_suggestion_preferences" for delete to authenticated
using (household_id = get_my_household_id())
;

create policy "shopping_suggestion_preferences_insert" on "public"."shopping_suggestion_preferences" for insert to authenticated
with check (household_id = get_my_household_id())
;

create policy "shopping_suggestion_preferences_select" on "public"."shopping_suggestion_preferences" for select to authenticated
using (household_id = get_my_household_id())
;

create policy "shopping_suggestion_preferences_update" on "public"."shopping_suggestion_preferences" for update to authenticated
using (household_id = get_my_household_id())
with check (household_id = get_my_household_id())
;

create policy "Authorized members can delete contribution participants" on "public"."task_contribution_participants" for delete to authenticated
using can_edit_task_contribution(contribution_id)
;

create policy "Authorized members can update contribution participants" on "public"."task_contribution_participants" for update to authenticated
using can_edit_task_contribution(contribution_id)
with check (can_edit_task_contribution(contribution_id) AND (EXISTS ( SELECT 1
   FROM (task_contributions tc
     JOIN members participant ON ((participant.id = task_contribution_participants.member_id)))
  WHERE ((tc.id = task_contribution_participants.contribution_id) AND (participant.household_id = tc.household_id)))))
;

create policy "Contribution creator can add participants" on "public"."task_contribution_participants" for insert to authenticated
with check (EXISTS ( SELECT 1
   FROM ((task_contributions tc
     JOIN members creator ON ((creator.id = tc.created_by)))
     JOIN members participant ON ((participant.id = task_contribution_participants.member_id)))
  WHERE ((tc.id = task_contribution_participants.contribution_id) AND (tc.household_id = get_my_household_id()) AND (creator.user_id = auth.uid()) AND (creator.household_id = tc.household_id) AND (creator.left_at IS NULL) AND (participant.household_id = tc.household_id) AND (participant.left_at IS NULL))))
;

create policy "Household members can view contribution participants" on "public"."task_contribution_participants" for select to authenticated
using (EXISTS ( SELECT 1
   FROM task_contributions tc
  WHERE ((tc.id = task_contribution_participants.contribution_id) AND (tc.household_id = get_my_household_id()))))
;

create policy "Contribution participants can update contribution" on "public"."task_contributions" for update to authenticated
using ((household_id = get_my_household_id()) AND ((EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = task_contributions.created_by) AND (m.user_id = auth.uid()) AND (m.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM (task_contribution_participants tcp
     JOIN members m ON ((m.id = tcp.member_id)))
  WHERE ((tcp.contribution_id = task_contributions.id) AND (m.user_id = auth.uid()) AND (m.left_at IS NULL))))))
with check ((household_id = get_my_household_id()) AND (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = task_contributions.updated_by) AND (m.user_id = auth.uid()) AND (m.household_id = task_contributions.household_id) AND (m.left_at IS NULL)))))
;

create policy "Household members can create task contributions" on "public"."task_contributions" for insert to authenticated
with check ((household_id = get_my_household_id()) AND (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = task_contributions.created_by) AND (m.user_id = auth.uid()) AND (m.household_id = task_contributions.household_id) AND (m.left_at IS NULL)))))
;

create policy "Household members can view task contributions" on "public"."task_contributions" for select to authenticated
using (household_id = get_my_household_id())
;

create policy "Accès foyer - tasks delete" on "public"."tasks" for delete to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - tasks insert" on "public"."tasks" for insert to public
with check (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - tasks select" on "public"."tasks" for select to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Accès foyer - tasks update" on "public"."tasks" for update to public
using (household_id IN ( SELECT members.household_id
   FROM members
  WHERE (members.user_id = auth.uid())))
;

create policy "Avatar personnel - ajouter" on "storage"."objects" for insert to authenticated
with check ((bucket_id = 'member-avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
;

create policy "Avatar personnel - modifier" on "storage"."objects" for update to authenticated
using ((bucket_id = 'member-avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
with check ((bucket_id = 'member-avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
;

create policy "Avatar personnel - supprimer" on "storage"."objects" for delete to authenticated
using ((bucket_id = 'member-avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
;

-- Déclencheurs

CREATE TRIGGER calendar_events_lock_scope BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.prevent_calendar_event_scope_change();

-- Stockage public des avatars (5 Mo maximum)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-avatars',
  'member-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

commit;

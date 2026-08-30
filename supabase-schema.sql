-- Dabo — Schéma de base de données
-- À exécuter dans Supabase : SQL Editor > New query > coller tout ce fichier > Run

-- Extension pour générer des identifiants uniques
create extension if not exists "pgcrypto";

-- Table des foyers
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  household_type text not null default 'couple' check (household_type in ('couple', 'coloc', 'famille')),
  equity_score_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Table des membres (liée à l'authentification Supabase)
create table members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  role text not null default 'member' check (role in ('creator', 'member')),
  rotation_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(household_id, user_id)
);

-- Table des routines (modèles de tâches récurrentes)
create table routines (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  weight_points integer not null default 15,
  frequency text not null check (frequency in ('weekly', 'monthly')),
  active boolean not null default true,
  last_assigned_member uuid references members(id),
  created_at timestamptz not null default now()
);

-- Table des tâches
create table tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  routine_id uuid references routines(id) on delete set null,
  name text not null,
  weight_points integer not null default 15,
  assigned_to uuid references members(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'done')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Table des articles de courses
create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  quantity text,
  assigned_to uuid references members(id) on delete set null,
  status text not null default 'to_buy' check (status in ('to_buy', 'bought')),
  bought_at timestamptz,
  created_at timestamptz not null default now()
);

-- Table des commentaires (partagés entre membres, sur une tâche ou un article)
create table comments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  text text not null,
  task_id uuid references tasks(id) on delete cascade,
  shopping_item_id uuid references shopping_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint one_target_only check (
    (task_id is not null and shopping_item_id is null) or
    (task_id is null and shopping_item_id is not null)
  )
);

-- Table des promos (notes partagées par le foyer, pas un catalogue externe)
create table promos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  product_name text not null,
  store_name text not null,
  note text,
  created_at timestamptz not null default now()
);

-- === Row Level Security ===
-- Principe : un utilisateur ne voit et ne modifie que les données de son propre foyer

alter table households enable row level security;
alter table members enable row level security;
alter table routines enable row level security;
alter table tasks enable row level security;
alter table shopping_items enable row level security;
alter table comments enable row level security;
alter table promos enable row level security;

-- Un utilisateur peut voir le foyer dont il est membre
create policy "Voir son propre foyer" on households for select
  using (id in (select household_id from members where user_id = auth.uid()));

-- Tout utilisateur connecté peut créer un foyer (à la création de compte)
create policy "Créer un foyer" on households for insert
  with check (auth.uid() is not null);

-- Un membre peut modifier son foyer (ex. toggle équité)
create policy "Modifier son foyer" on households for update
  using (id in (select household_id from members where user_id = auth.uid()));

-- Un utilisateur voit les membres de son propre foyer
create policy "Voir les membres du foyer" on members for select
  using (household_id in (select household_id from members where user_id = auth.uid()));

-- Un utilisateur peut créer sa propre ligne de membre (rejoindre un foyer)
create policy "Rejoindre un foyer" on members for insert
  with check (user_id = auth.uid());

-- Un utilisateur peut quitter un foyer (supprimer sa propre ligne)
create policy "Quitter un foyer" on members for delete
  using (user_id = auth.uid());

-- Politique générique réutilisée pour tasks, shopping_items, routines, comments, promos :
-- accès total en lecture/écriture si on appartient au même foyer

create policy "Accès foyer - routines select" on routines for select
  using (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - routines insert" on routines for insert
  with check (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - routines update" on routines for update
  using (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - routines delete" on routines for delete
  using (household_id in (select household_id from members where user_id = auth.uid()));

create policy "Accès foyer - tasks select" on tasks for select
  using (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - tasks insert" on tasks for insert
  with check (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - tasks update" on tasks for update
  using (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - tasks delete" on tasks for delete
  using (household_id in (select household_id from members where user_id = auth.uid()));

create policy "Accès foyer - shopping select" on shopping_items for select
  using (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - shopping insert" on shopping_items for insert
  with check (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - shopping update" on shopping_items for update
  using (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - shopping delete" on shopping_items for delete
  using (household_id in (select household_id from members where user_id = auth.uid()));

create policy "Accès foyer - comments select" on comments for select
  using (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - comments insert" on comments for insert
  with check (household_id in (select household_id from members where user_id = auth.uid()));

create policy "Accès foyer - promos select" on promos for select
  using (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - promos insert" on promos for insert
  with check (household_id in (select household_id from members where user_id = auth.uid()));
create policy "Accès foyer - promos delete" on promos for delete
  using (household_id in (select household_id from members where user_id = auth.uid()));

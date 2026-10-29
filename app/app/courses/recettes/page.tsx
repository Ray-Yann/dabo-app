"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, Pencil, Globe2, LockKeyhole, Users, Save } from "lucide-react";
import { CoursesSectionNav } from "@/components/CoursesSectionNav";
import { useHousehold } from "@/lib/use-household";

type Visibility = "private" | "household" | "selected" | "public";
type Ingredient = { name: string; amount: number; unit: "piece" | "g" | "kg" | "ml" | "l" };
type RecipeGrant = { recipe_id: string; household_id: string; status: "pending" | "accepted" };
type Recipe = { id: string; owner_user_id: string; title: string; instructions: string; portions: number; visibility: Visibility; primary_household_id: string | null; dabo_recipe_ingredients: Ingredient[] };
const emptyIngredient = (): Ingredient => ({ name: "", amount: 1, unit: "piece" });
const visibilityLabels: Record<Visibility, string> = { private: "Privée", household: "Mon foyer", selected: "Foyers choisis", public: "Publique" };

export default function RecettesPage() {
 const { supabase, household, memberships, loading: householdLoading, offlineFallback } = useHousehold();
 const [recipes, setRecipes] = useState<Recipe[]>([]);
 const [grants, setGrants] = useState<RecipeGrant[]>([]);
 const [inviteHouseholdId, setInviteHouseholdId] = useState("");
 const [userId, setUserId] = useState<string | null>(null);
 const [busy, setBusy] = useState(false);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [notice, setNotice] = useState("");
 const [editing, setEditing] = useState<string | "new" | null>(null);
 const [title, setTitle] = useState("");
 const [instructions, setInstructions] = useState("");
 const [portions, setPortions] = useState(2);
 const [visibility, setVisibility] = useState<Visibility>("private");
 const [selectedHousehold, setSelectedHousehold] = useState("");
 const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);
 const [query, setQuery] = useState("");
 const [scope, setScope] = useState<"mine" | "all">("mine");

 const reload = useCallback(async () => {
  if (offlineFallback) { setLoading(false); return; }
  setLoading(true);
  const [user, result, grantResult] = await Promise.all([
   supabase.auth.getUser(),
   supabase.from("dabo_recipes").select("id,owner_user_id,title,instructions,portions,visibility,primary_household_id,dabo_recipe_ingredients(name,amount,unit)").order("created_at", { ascending: false }).limit(100),
   supabase.from("dabo_recipe_household_grants").select("recipe_id,household_id,status").limit(200),
  ]);
  setUserId(user.data.user?.id ?? null);
  if (grantResult.error) setError(`Impossible de charger les invitations : ${grantResult.error.message}`);
  else setGrants((grantResult.data ?? []) as RecipeGrant[]);
  if (result.error) setError(`Impossible de charger les recettes : ${result.error.message}`);
  else { setRecipes((result.data ?? []) as Recipe[]); if (!grantResult.error) setError(""); }
  setLoading(false);
 }, [supabase, offlineFallback]);
 useEffect(() => { if (!householdLoading) void reload(); }, [householdLoading, reload]);

 function openEditor(recipe?: Recipe) {
  setError(""); setNotice("");
  setInviteHouseholdId("");
  setEditing(recipe?.id ?? "new"); setTitle(recipe?.title ?? ""); setInstructions(recipe?.instructions ?? "");
  setPortions(recipe?.portions ?? 2); setVisibility(recipe?.visibility ?? "private");
  setSelectedHousehold(recipe?.primary_household_id ?? household?.id ?? "");
  setIngredients(recipe?.dabo_recipe_ingredients?.length ? recipe.dabo_recipe_ingredients.map(i => ({ ...i })) : [emptyIngredient()]);
 }
 async function save() {
  if (busy || offlineFallback) return;
  if (!title.trim() || title.trim().length > 160 || !Number.isInteger(portions) || portions < 1 || portions > 100) { setError("Vérifie le titre et les portions (1 à 100)."); return; }
  const cleaned = ingredients.filter(i => i.name.trim());
  if (cleaned.some(i => !Number.isFinite(i.amount) || i.amount <= 0 || i.amount > 999999999 || i.name.trim().length > 160)) { setError("Vérifie les quantités et les noms des ingrédients."); return; }
  if (visibility === "household" && !memberships.some(m => m.household.id === selectedHousehold)) { setError("Choisis un foyer auquel tu appartiens."); return; }
  setBusy(true); setError(""); setNotice("");
  try {
   let id = editing;
   if (editing === "new") {
    const created = await supabase.rpc("dabo_recipe_create", { p_title: title.trim(), p_instructions: instructions, p_portions: portions });
    if (created.error) throw created.error;
    id = created.data as string;
   } else {
    const updated = await supabase.rpc("dabo_recipe_update", { p_recipe: id, p_title: title.trim(), p_instructions: instructions, p_portions: portions });
    if (updated.error) throw updated.error;
   }
   const changed = await supabase.rpc("dabo_recipe_replace_ingredients", { p_recipe: id, p_ingredients: cleaned.map(i => ({ ...i, name: i.name.trim() })) });
   if (changed.error) throw changed.error;
   const existing = recipes.find(r => r.id === id);
   if (!existing || existing.visibility !== visibility || (visibility === "household" && existing.primary_household_id !== selectedHousehold)) {
    const shared = await supabase.rpc("dabo_recipe_set_visibility", { p_recipe: id, p_visibility: visibility, p_household: visibility === "household" ? selectedHousehold : null });
    if (shared.error) throw shared.error;
   }
   setEditing(null); setNotice("Recette enregistrée."); await reload();
  } catch (e) { setError(e instanceof Error ? e.message : "Impossible d'enregistrer la recette."); }
  finally { setBusy(false); }
 }
 async function remove(id: string) {
  if (busy || !window.confirm("Supprimer définitivement cette recette ?")) return;
  setBusy(true); setError("");
  const result = await supabase.rpc("dabo_recipe_delete", { p_recipe: id });
  if (result.error) setError(result.error.message); else { setNotice("Recette supprimée."); await reload(); }
  setBusy(false);
 }
 async function copyHouseholdCode(id: string) {
  try {
   if (!navigator.clipboard?.writeText) throw new Error("Copie indisponible");
   await navigator.clipboard.writeText(id);
   setError(""); setNotice("Code du foyer copié. Transmets-le uniquement à la personne qui doit partager une recette avec ce foyer.");
  } catch {
   setNotice(""); setError("La copie automatique est indisponible. Sélectionne le code affiché pour le copier manuellement.");
  }
 }
 async function changeGrant(action: "invite" | "accept" | "revoke", recipeId: string, householdId: string) {
  if (busy || offlineFallback) return;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(householdId)) {
   setError("Identifiant du foyer invalide."); return;
  }
  setBusy(true); setError(""); setNotice("");
  try {
   const fn = action === "invite" ? "dabo_recipe_invite_household" : action === "accept" ? "dabo_recipe_accept_household" : "dabo_recipe_revoke_household";
   const result = await supabase.rpc(fn, { p_recipe: recipeId, p_household: householdId });
   if (result.error) throw result.error;
   setNotice(action === "invite" ? "Invitation envoyée. Le foyer doit l'accepter." : action === "accept" ? "Invitation acceptée." : "Accès au foyer révoqué.");
   setInviteHouseholdId(""); await reload();
  } catch (e) { setError(e instanceof Error ? e.message : "Opération impossible."); }
  finally { setBusy(false); }
 }
 const incoming = grants.filter(g => g.status === "pending" && memberships.some(m => m.household.id === g.household_id) && !recipes.some(r => r.id === g.recipe_id && r.owner_user_id === userId));
 const visible = recipes.filter(r => (scope === "all" || r.owner_user_id === userId) && r.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return (
  <main className="mx-auto w-full max-w-5xl pb-24 text-ink">
   <div className="px-5 pt-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">Cuisine & foyer</p><h1 className="mt-2 font-serif text-4xl">Mes recettes</h1><p className="mt-2 text-sm opacity-70">Vos idées, vos ingrédients, vos moments à partager.</p></div>
   <div className="mt-6"><CoursesSectionNav /></div>
   <div className="mx-5 flex flex-wrap items-center gap-3"><button type="button" onClick={() => openEditor()} disabled={offlineFallback || busy} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50"><Plus size={17}/> Nouvelle recette</button><button type="button" onClick={() => setScope(scope === "mine" ? "all" : "mine")} className="rounded-full border border-line px-4 py-3 text-sm">{scope === "mine" ? "Découvrir les recettes accessibles" : "Voir mes recettes"}</button></div>
   <div className="mx-5 mt-5"><label htmlFor="recipe-search" className="sr-only">Rechercher une recette</label><input id="recipe-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une recette…" className="w-full rounded-2xl border border-line bg-surface p-3 text-sm"/></div>
   {error && <p role="alert" className="mx-5 mt-4 rounded-xl border border-red-400 p-3 text-sm text-red-700">{error}</p>}
   {notice && <p role="status" className="mx-5 mt-4 text-sm">{notice}</p>}
   {offlineFallback && <p className="mx-5 mt-4 text-sm">Les recettes nécessitent une connexion pour préserver les autorisations de partage.</p>}
   {editing && <section aria-label="Éditeur de recette" className="mx-5 mt-6 space-y-4 rounded-3xl border border-line bg-surface p-5">
    <h2 className="font-serif text-2xl">{editing === "new" ? "Nouvelle recette" : "Modifier la recette"}</h2>
    <label className="block text-sm">Nom de la recette<input value={title} maxLength={160} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-paper p-3"/></label>
    <label className="block text-sm">Portions<input type="number" min={1} max={100} value={portions} onChange={e => setPortions(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-line bg-paper p-3"/></label>
    <label className="block text-sm">Préparation<textarea rows={5} value={instructions} onChange={e => setInstructions(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-paper p-3"/></label>
    <h3 className="font-semibold">Ingrédients</h3>
    {ingredients.map((ingredient, index) => <div key={index} className="flex flex-wrap items-center gap-2"><input aria-label={`Ingrédient ${index+1}`} placeholder="Ingrédient" maxLength={160} value={ingredient.name} onChange={e => setIngredients(v => v.map((i,j) => j===index ? {...i,name:e.target.value} : i))} className="min-w-0 flex-[3] rounded-xl border border-line bg-paper p-2 text-sm"/><input aria-label={`Quantité ${index+1}`} type="number" min="0.001" step="any" value={ingredient.amount} onChange={e => setIngredients(v => v.map((i,j) => j===index ? {...i,amount:Number(e.target.value)} : i))} className="w-20 rounded-xl border border-line bg-paper p-2 text-sm"/><select aria-label={`Unité ${index+1}`} value={ingredient.unit} onChange={e => setIngredients(v => v.map((i,j) => j===index ? {...i,unit:e.target.value as Ingredient["unit"]} : i))} className="rounded-xl border border-line bg-paper p-2 text-sm">{["piece","g","kg","ml","l"].map(u => <option key={u} value={u}>{u === "piece" ? "pièce" : u}</option>)}</select><button type="button" aria-label={`Retirer l'ingrédient ${index+1}`} onClick={() => setIngredients(v => v.filter((_,j) => j!==index))}><Trash2 size={18}/></button></div>)}
    <button type="button" onClick={() => setIngredients(v => v.length < 100 ? [...v,emptyIngredient()] : v)} className="text-sm underline">+ Ajouter un ingrédient</button>
    <label className="block text-sm">Visibilité<select value={visibility} onChange={e => setVisibility(e.target.value as Visibility)} className="mt-1 w-full rounded-xl border border-line bg-paper p-3">{Object.entries(visibilityLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {visibility === "household" && <label className="block text-sm">Foyer destinataire<select value={selectedHousehold} onChange={e => setSelectedHousehold(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-paper p-3">{memberships.map(m => <option key={m.household.id} value={m.household.id}>{m.household.name}</option>)}</select></label>}
    {visibility === "selected" && <p className="text-sm opacity-70">Enregistre d’abord la recette, puis invite les foyers depuis sa fiche. Chaque foyer doit accepter avant de pouvoir la consulter.</p>}
    <div className="flex gap-3"><button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm text-paper disabled:opacity-50"><Save size={16}/> Enregistrer</button><button type="button" onClick={() => setEditing(null)} className="rounded-full border border-line px-5 py-3 text-sm">Annuler</button></div>
   </section>}
   {memberships.length > 0 && <section className="mx-5 mt-6 rounded-3xl border border-line bg-surface p-5" aria-label="Recevoir des recettes d’un autre foyer"><h2 className="font-serif text-2xl">Recevoir une recette</h2><p className="mt-2 text-sm opacity-70">Pour qu’un proche propose une recette à votre foyer, transmettez-lui son code de partage. Il ne donne aucun accès à vos données : vous devrez accepter chaque invitation.</p><div className="mt-4 space-y-3">{memberships.map(m => <div key={m.household.id} className="rounded-xl border border-line p-3"><p className="text-sm font-semibold">{m.household.name}</p><div className="mt-2 flex flex-wrap items-center gap-2"><input aria-label={`Code de partage du foyer ${m.household.name}`} readOnly value={m.household.id} onFocus={e => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-line bg-paper p-2 font-mono text-xs"/><button type="button" onClick={() => void copyHouseholdCode(m.household.id)} className="rounded-full border border-line px-3 py-2 text-sm">Copier le code</button></div></div>)}</div></section>}
   {incoming.length > 0 && <section className="mx-5 mt-6 space-y-3" aria-label="Invitations de recettes reçues"><h2 className="font-serif text-2xl">Invitations reçues</h2>{incoming.map(g => <div key={`${g.recipe_id}-${g.household_id}`} className="rounded-2xl border border-line bg-surface p-4"><p className="text-sm">Une recette a été proposée à {memberships.find(m => m.household.id === g.household_id)?.household.name ?? "votre foyer"}.</p><button type="button" disabled={busy || offlineFallback} onClick={() => void changeGrant("accept", g.recipe_id, g.household_id)} className="mt-2 rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-50">Accepter l’invitation</button></div>)}</section>}
   <div className="mx-5 mt-7 grid gap-4 md:grid-cols-2">{loading ? <p>Chargement des recettes…</p> : visible.length === 0 ? <div className="rounded-3xl border border-line bg-surface p-8 text-center"><BookOpen className="mx-auto mb-3 opacity-50"/><p>Aucune recette à afficher.</p></div> : visible.map(recipe => <article key={recipe.id} className="rounded-3xl border border-line bg-surface p-5"><div className="flex items-start justify-between gap-2"><h2 className="font-serif text-2xl">{recipe.title}</h2><span className="inline-flex items-center gap-1 text-xs opacity-70">{recipe.visibility === "public" ? <Globe2 size={14}/> : recipe.visibility === "private" ? <LockKeyhole size={14}/> : <Users size={14}/>} {visibilityLabels[recipe.visibility]}</span></div><p className="mt-2 text-sm opacity-70">{recipe.portions} portion(s) · {recipe.dabo_recipe_ingredients?.length ?? 0} ingrédient(s)</p>{recipe.dabo_recipe_ingredients?.length > 0 && <ul className="mt-3 space-y-1 text-sm">{recipe.dabo_recipe_ingredients.map((i,index) => <li key={index}>{i.amount} {i.unit === "piece" ? "pièce(s)" : i.unit} · {i.name}</li>)}</ul>}{recipe.instructions && <p className="mt-4 whitespace-pre-wrap text-sm">{recipe.instructions}</p>}{recipe.owner_user_id === userId && recipe.visibility === "selected" && <div className="mt-4 space-y-3 border-t border-line pt-4"><h3 className="text-sm font-semibold">Foyers invités</h3>{grants.filter(g => g.recipe_id === recipe.id).map(g => <div key={g.household_id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{memberships.find(m => m.household.id === g.household_id)?.household.name ?? g.household_id} · {g.status === "accepted" ? "Acceptée" : "En attente"}</span><button type="button" disabled={busy || offlineFallback} onClick={() => void changeGrant("revoke", recipe.id, g.household_id)} className="underline disabled:opacity-50">Révoquer</button></div>)}<label className="block text-sm">Code de partage du foyer destinataire<input value={inviteHouseholdId} onChange={e => setInviteHouseholdId(e.target.value.trim())} placeholder="Coller le code reçu" className="mt-1 w-full rounded-xl border border-line bg-paper p-2"/></label><button type="button" disabled={busy || offlineFallback || !inviteHouseholdId} onClick={() => void changeGrant("invite", recipe.id, inviteHouseholdId)} className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50">Inviter ce foyer</button><p className="text-xs opacity-70">Demande au destinataire de copier le code depuis « Recevoir une recette ». Aucun accès n’est accordé avant acceptation.</p></div>}{recipe.owner_user_id === userId && <div className="mt-5 flex gap-4"><button type="button" onClick={() => openEditor(recipe)} className="inline-flex items-center gap-1 text-sm underline"><Pencil size={15}/> Modifier</button><button type="button" onClick={() => void remove(recipe.id)} className="inline-flex items-center gap-1 text-sm underline"><Trash2 size={15}/> Supprimer</button></div>}</article>)}</div>
  </main>
 );
}

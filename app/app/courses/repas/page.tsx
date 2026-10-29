"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CoursesSectionNav } from "@/components/CoursesSectionNav";
import { useHousehold } from "@/lib/use-household";
type Recipe = { id:string; title:string; portions:number };
type Need = {ingredient_name:string;unit:string;required:number;available:number;missing:number};
type ShoppingConflict = {name?:string;kind?:string;existing_quantity?:string|null;requested_quantity?:string|null};
type Meal = { id:string; recipe_title:string|null; planned_for:string; meal_slot:string; portions:number };
const addDays = (iso:string, days:number) => { const [y,m,d]=iso.split("-").map(Number); const date=new Date(0); date.setUTCFullYear(y,m-1,d+days); date.setUTCHours(0,0,0,0); if(date.getUTCFullYear()>9999)return "9999-12-31"; return `${String(date.getUTCFullYear()).padStart(4,"0")}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`; };
const validDay = (value:string) => {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [year,month,day]=value.split("-").map(Number);
 if(year<1||year>9999||month<1||month>12||day<1||day>31)return false;
 const date=new Date(0);date.setUTCFullYear(year,month-1,day);date.setUTCHours(0,0,0,0);
 return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
};
const slots = { breakfast:"Petit-déjeuner", lunch:"Déjeuner", dinner:"Dîner", snack:"Collation" } as const;
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
export default function RepasPage() {
 const {supabase,household,loading:householdLoading,offlineFallback}=useHousehold();
 const [recipes,setRecipes]=useState<Recipe[]>([]),[meals,setMeals]=useState<Meal[]>([]);
 const [day,setDay]=useState(today),[recipeId,setRecipeId]=useState(""),[slot,setSlot]=useState<keyof typeof slots>("dinner"),[portions,setPortions]=useState(2);
 const [needs,setNeeds]=useState<Need[]>([]),[needsError,setNeedsError]=useState("");
 const [period,setPeriod]=useState<"day"|"week">("day");
 const endDate=period==="week"?addDays(day,6):day;
 const [selectedNeeds,setSelectedNeeds]=useState<string[]>([]),[shoppingResult,setShoppingResult]=useState("");
 const [shoppingConflicts,setShoppingConflicts]=useState<ShoppingConflict[]>([]);
 const requestSequence=useRef(0);
 const selectionContext=useRef("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const reload=useCallback(async()=>{
  const requestId=++requestSequence.current;
  selectionContext.current="";
  setSelectedNeeds([]);setShoppingResult("");setShoppingConflicts([]);
  if(!household?.id||offlineFallback){setMeals([]);setNeeds([]);setLoading(false);return;}
  setLoading(true);
  try {
  const [r,m,n]=await Promise.all([
   supabase.from("dabo_recipes").select("id,title,portions").order("title").limit(300),
   supabase.rpc("dabo_meal_plan_list",{p_household:household.id,p_date:day}),
   supabase.rpc("dabo_meal_needs_for_period",{p_household:household.id,p_from:day,p_to:endDate})
  ]);
  if(requestId!==requestSequence.current)return;
  if(r.error||m.error){
   setRecipes([]);setMeals([]);setNeeds([]);setNeedsError("Le planning n’a pas pu être vérifié. Les achats sont désactivés jusqu’au prochain chargement.");
   setError(r.error?.message??m.error?.message??"Chargement impossible");setLoading(false);return;
  }
  setRecipes((r.data??[]) as Recipe[]);setMeals((m.data??[]) as Meal[]);setError("");
  if(n.error){setNeeds([]);setNeedsError(n.error.message.includes("Meal needs unavailable") ? "Une recette du planning est devenue inaccessible. Retirez-la ou remplacez-la avant de calculer les achats." : n.error.message);}else{setNeeds((n.data??[]) as Need[]);setNeedsError("");}
  selectionContext.current=`${household.id}|${day}|${endDate}`;
  setLoading(false);
  } catch (caught) {
   if(requestId!==requestSequence.current)return;
   setRecipes([]);setMeals([]);setNeeds([]);setSelectedNeeds([]);
   setNeedsError("Impossible de vérifier les besoins pour le moment. Aucun achat ne peut être préparé.");
   setError(caught instanceof Error?caught.message:"Erreur de connexion inattendue");
   setLoading(false);
  }
 },[supabase,household?.id,offlineFallback,day,endDate]);
 useEffect(()=>{if(!householdLoading)void reload();},[householdLoading,reload]);
 async function add(){if(!household||!recipeId||busy||offlineFallback)return;
  if(!Number.isInteger(portions)||portions<1||portions>100){setError("Entre 1 et 100 portions.");return;}
  setBusy(true);
  try {
   const result=await supabase.rpc("dabo_meal_plan_add",{p_household:household.id,p_recipe:recipeId,p_date:day,p_slot:slot,p_portions:portions});
   if(result.error)setError(result.error.message);else await reload();
  } catch(caught) {setError(caught instanceof Error?caught.message:"Impossible de planifier ce repas.");}
  finally {setBusy(false);}
 }
 async function addMissingToShopping(){
  if(!household?.id||offlineFallback||busy||loading||needsError||selectedNeeds.length===0)return;
  if(selectionContext.current!==`${household.id}|${day}|${endDate}`)return;
  setBusy(true);setShoppingResult("");setShoppingConflicts([]);
  const selected=needs.filter(n=>n.missing>0&&selectedNeeds.includes(`${n.ingredient_name}|${n.unit}`))
   .map(n=>({name:n.ingredient_name,unit:n.unit}));
  if(selected.length===0){setBusy(false);return;}
  const submittedContext=selectionContext.current;
  try {
   const {data,error:rpcError}=await supabase.rpc("dabo_meal_shopping_add_for_period",{
    p_household:household.id,p_from:day,p_to:endDate,p_selected:selected
   });
   if(submittedContext!==selectionContext.current)return;
   if(rpcError)setError(rpcError.message);
   else {
    const result=data as {added?:number;skipped?:number;conflicts?:ShoppingConflict[]}|null;
    const conflicts=result?.conflicts??[];
    setShoppingConflicts(conflicts);
    setShoppingResult(`${result?.added??0} ajouté(s), ${result?.skipped??0} déjà présent(s).${conflicts.length?` ${conflicts.length} conflit(s) de quantité à traiter dans Courses.`:""}`);
    setSelectedNeeds([]);setError("");
   }
  } catch(caught) {
   if(submittedContext===selectionContext.current)
    setError(caught instanceof Error?caught.message:"Impossible d’ajouter les ingrédients aux courses.");
  } finally {
   setBusy(false);
  }
 }
 async function remove(id:string){if(busy||offlineFallback)return;setBusy(true);
  try {
   const result=await supabase.rpc("dabo_meal_plan_remove",{p_id:id});
   if(result.error)setError(result.error.message);else await reload();
  } catch(caught) {setError(caught instanceof Error?caught.message:"Impossible de retirer ce repas.");}
  finally {setBusy(false);}
 }
 return <main className="mx-auto w-full max-w-5xl pb-24 text-ink">
  <header className="px-5 pt-7"><p className="text-xs uppercase tracking-[0.2em] opacity-60">Cuisine & foyer</p><h1 className="mt-2 font-serif text-4xl">Mes repas</h1><p className="mt-2 text-sm opacity-70">Planifiez les repas de votre foyer.</p></header>
  <div className="mt-6"><CoursesSectionNav/></div>
  {!household?<p className="mx-5">Choisissez un foyer pour commencer.</p>:<div className="mx-5 space-y-5">
   <label className="block rounded-3xl border border-line bg-surface p-5 text-sm">Jour<input type="date" value={day} onChange={e=>{if(!validDay(e.target.value))return;requestSequence.current++;selectionContext.current="";setSelectedNeeds([]);setNeeds([]);setShoppingResult("");setShoppingConflicts([]);setError("");setNeedsError("");setLoading(true);setDay(e.target.value);}} className="mt-2 block w-full rounded-xl border border-line bg-paper p-3"/></label>
   {!offlineFallback&&<section className="rounded-3xl border border-line bg-surface p-5"><h2 className="font-serif text-2xl">Prévoir un repas</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
    <label className="text-sm">Recette<select value={recipeId} onChange={e=>{setRecipeId(e.target.value);const r=recipes.find(x=>x.id===e.target.value);if(r)setPortions(r.portions);}} className="mt-1 w-full rounded-xl border border-line bg-paper p-3"><option value="">Choisir une recette</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
    <label className="text-sm">Repas<select value={slot} onChange={e=>setSlot(e.target.value as keyof typeof slots)} className="mt-1 w-full rounded-xl border border-line bg-paper p-3">{Object.entries(slots).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label className="text-sm">Portions<input type="number" min={1} max={100} value={portions} onChange={e=>setPortions(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-line bg-paper p-3"/></label></div>
    <button type="button" disabled={busy||!recipeId} onClick={()=>void add()} className="mt-4 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50">Ajouter au planning</button>
    {recipes.length===0&&<p className="mt-3 text-sm">Aucune recette accessible. <Link href="/app/courses/recettes" className="underline">Créer une recette</Link></p>}
   </section>}
   {offlineFallback&&<p role="status">Connexion nécessaire pour modifier le planning.</p>}
   {error&&<p role="alert" className="rounded-xl border border-red-400 p-3 text-sm text-red-700">{error}</p>}
   <section><h2 className="mb-3 font-serif text-2xl">Au programme</h2>{loading?<p>Chargement…</p>:meals.length===0?<p>Aucun repas prévu ce jour.</p>:<div className="grid gap-3 sm:grid-cols-2">{meals.map(m=>{
    return <article key={m.id} className="rounded-3xl border border-line bg-surface p-5"><p className="text-xs uppercase opacity-60">{slots[m.meal_slot as keyof typeof slots]??m.meal_slot}</p><h3 className="mt-2 font-serif text-xl">{m.recipe_title??"Recette indisponible"}</h3><p className="mt-1 text-sm opacity-70">{m.portions} portion(s)</p><button type="button" disabled={busy||offlineFallback} onClick={()=>void remove(m.id)} className="mt-3 text-sm underline disabled:opacity-50">Retirer du planning</button></article>;
   })}</div>}</section>
  </div>}
  {household&&!offlineFallback&&<section className="mx-5 mt-6 rounded-3xl border border-line bg-surface p-5" aria-label="Ingrédients nécessaires">
   <h2 className="font-serif text-2xl">Ingrédients nécessaires</h2>
   <fieldset className="mt-3 flex gap-4 text-sm"><legend className="sr-only">Période de calcul</legend><label className="flex items-center gap-2"><input type="radio" name="meal-needs-period" checked={period==="day"} onChange={()=>{requestSequence.current++;selectionContext.current="";setSelectedNeeds([]);setNeeds([]);setShoppingResult("");setShoppingConflicts([]);setError("");setNeedsError("");setLoading(true);setPeriod("day");}}/>Ce jour</label><label className="flex items-center gap-2"><input type="radio" name="meal-needs-period" checked={period==="week"} onChange={()=>{requestSequence.current++;selectionContext.current="";setSelectedNeeds([]);setNeeds([]);setShoppingResult("");setShoppingConflicts([]);setError("");setNeedsError("");setLoading(true);setPeriod("week");}}/>7 jours</label></fieldset>
   <p className="mt-1 text-sm opacity-70">Comparaison indicative du {day} au {endDate}. Le stock est déduit une seule fois sur la période et n’est jamais modifié.</p>
   {needsError?<p role="alert" className="mt-3 text-sm">Comparaison indisponible : {needsError}</p>:loading?<p className="mt-3 text-sm">Chargement…</p>:needs.length===0?<p className="mt-3 text-sm">Aucun ingrédient à comparer.</p>:<ul className="mt-3 space-y-2">{needs.map(n=><li key={`${n.ingredient_name}|${n.unit}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm"><span className="flex items-center gap-2">{n.missing>0&&<input type="checkbox" aria-label={`Ajouter ${n.ingredient_name} aux courses`} checked={selectedNeeds.includes(`${n.ingredient_name}|${n.unit}`)} onChange={e=>setSelectedNeeds(previous=>e.target.checked?[...previous,`${n.ingredient_name}|${n.unit}`]:previous.filter(key=>key!==`${n.ingredient_name}|${n.unit}`))} disabled={busy||loading}/>} {n.ingredient_name}</span><span>{n.missing>0?`À prévoir : ${n.missing} ${n.unit}`:`Disponible (${n.available} ${n.unit})`}</span></li>)}</ul>}
   {selectedNeeds.length>0&&<button type="button" disabled={busy||loading||!!needsError} onClick={()=>void addMissingToShopping()} className="mt-3 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50">Ajouter la sélection aux Courses</button>}
   {shoppingResult&&<p role="status" className="mt-3 text-sm">{shoppingResult} {shoppingConflicts.length>0&&<Link href="/app/courses" className="font-semibold underline">Ouvrir les Courses pour vérifier les quantités</Link>}</p>}
   {shoppingConflicts.length>0&&<section aria-label="Conflits de quantités" className="mt-3 rounded-2xl border border-line p-4"><h3 className="font-semibold">Quantités à vérifier</h3><p className="mt-1 text-sm opacity-70">Aucune quantité existante n’a été modifiée automatiquement. Comparez les valeurs avant de corriger votre liste de courses.</p><ul className="mt-2 space-y-2">{shoppingConflicts.map((conflict,index)=><li key={`${conflict.name??"article"}-${index}`} className="border-b border-line pb-2 text-sm"><strong>{conflict.name??"Article"}</strong><span className="block">{conflict.kind==="quantity_mismatch"?`Dans les courses : ${conflict.existing_quantity??"non renseignée"} · Besoin calculé : ${conflict.requested_quantity??"non renseigné"}`:`À vérifier : ${conflict.requested_quantity??"quantité non renseignée"}`}</span></li>)}</ul><Link href="/app/courses" className="mt-2 inline-block text-sm font-semibold underline">Vérifier dans mes Courses</Link></section>}
   <p className="mt-3 text-xs opacity-60">Correspondance stricte des noms et des unités. Pour 7 jours, seuls les stocks valables jusqu’au dernier jour sont comptabilisés.</p>
  </section>}
 </main>;
}

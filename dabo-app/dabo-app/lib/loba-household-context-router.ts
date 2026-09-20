import type { LobaAiMessage } from "@/lib/loba-ai";
import type { LobaHouseholdContext } from "@/lib/loba-household-ai";

export type LobaHouseholdDomain="finance"|"shopping"|"tasks"|"calendar"|"balance"|"general";

const rules:Record<Exclude<LobaHouseholdDomain,"general">,RegExp>={
 finance:/\b(finance|budget|d[ée]pens|factur|payer|pay[ée]|paiement|argent|euro|€|co[uû]t|prix|montant|abonnement|loyer|spent|spend|expense|bill|budget|paid|money|betaling|uitgav|factuur|geld|betaal)\b/i,
 shopping:/\b(course|courses|achat|acheter|liste|article|supermarch|shopping|grocery|groceries|buy|boodschap|boodschappen|kopen)\b/i,
 tasks:/\b(t[âa]che|corv[ée]e|assign|attribut|urgent|effort|task|chore|to[- ]?do|taak|klus)\b/i,
 calendar:/\b(calendrier|agenda|[ée]v[ée]nement|rendez[- ]?vous|anniversaire|date|calendar|event|appointment|agenda|afspraak|evenement)\b/i,
 balance:/\b([ée]quilibre|contribution|points?|r[ée]partition|charge mentale|balance|contribution|punten|verdeling)\b/i,
};

export function detectHouseholdDomain(question:string,history:LobaAiMessage[]=[]):LobaHouseholdDomain{
 const detect=(text:string)=>{
  const hits=(Object.entries(rules) as Array<[Exclude<LobaHouseholdDomain,"general">,RegExp]>).filter(([,rx])=>rx.test(text)).map(([k])=>k);
  if(hits.includes("finance"))return "finance" as const;
  return hits[0]||null;
 };
 // La question courante prime toujours. L’historique sert seulement à résoudre une relance
 // courte comme « et pour cette année ? », sans contaminer une nouvelle intention.
 const current=detect(question);if(current)return current;
 const recent=history.slice(-4).map(x=>x.content||"").join(" ");
 return detect(recent)||"general";
}

export function routeHouseholdContext(context:LobaHouseholdContext,domain:LobaHouseholdDomain):LobaHouseholdContext{
 const base={...context,tasks:[],shopping:[],events:[],balance:[],finance:undefined} as LobaHouseholdContext;
 const compactFinance=context.finance?{
  ...context.finance,
  pendingBills:context.finance.pendingBills.slice(0,30),
  budgets:context.finance.budgets.slice(0,20),
  recentTransactions:context.finance.recentTransactions.slice(0,20),
 }:undefined;
 if(domain==="finance")return{...base,finance:compactFinance};
 if(domain==="shopping")return{...base,shopping:context.shopping.slice(0,40)};
 if(domain==="tasks")return{...base,tasks:context.tasks.slice(0,40)};
 if(domain==="calendar")return{...base,events:context.events.slice(0,40)};
 if(domain==="balance")return{...base,balance:context.balance?.slice(0,20),tasks:context.tasks.slice(0,20)};
 // Questions réellement transversales : contexte borné, jamais la photographie complète du foyer.
 return{...context,tasks:context.tasks.slice(0,15),shopping:context.shopping.slice(0,15),events:context.events.slice(0,15),balance:context.balance?.slice(0,12),finance:compactFinance?{...compactFinance,pendingBills:compactFinance.pendingBills.slice(0,10),recentTransactions:compactFinance.recentTransactions.slice(0,10)}:undefined};
}

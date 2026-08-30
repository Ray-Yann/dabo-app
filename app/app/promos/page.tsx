"use client";

import { useEffect, useState } from "react";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { Promo } from "@/lib/types";
import { relativeDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export default function PromosPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [product, setProduct] = useState("");
  const [store, setStore] = useState("");
  const [note, setNote] = useState("");

  async function loadPromos() {
    if (!household) return;
    const { data } = await supabase.from("promos").select("*").eq("household_id", household.id).order("created_at", { ascending: false });
    setPromos((data as Promo[]) || []);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (household) loadPromos();
  }, [household]);

  async function addPromo() {
    if (!product.trim() || !store.trim() || !household || !me) return;
    await supabase.from("promos").insert({ household_id: household.id, author_id: me.id, product_name: product.trim(), store_name: store.trim(), note: note || null });
    setProduct("");
    setStore("");
    setNote("");
    setShowAdd(false);
    loadPromos();
  }
  async function remove(id: string) {
    await supabase.from("promos").delete().eq("id", id);
    loadPromos();
  }

  if (loading || !household) return <div className="p-8 text-center text-muted">Chargement…</div>;

  return (
    <div>
      <div className="flex items-start justify-between px-5 pt-8 pb-2">
        <Header title="Promos" />
        <button onClick={() => setShowAdd(true)} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium mt-8 mr-5">
          Ajouter
        </button>
      </div>
      <p className="px-5 text-xs text-muted -mt-2 mb-4">Notes partagées par votre foyer — pas un catalogue de magasin.</p>

      {showAdd && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4 space-y-2">
          <input autoFocus placeholder="Produit (ex. Beurre)" value={product} onChange={(e) => setProduct(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
          <input placeholder="Magasin (ex. Lidl)" value={store} onChange={(e) => setStore(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
          <input placeholder="Remarque (ex. jusqu'à dimanche)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
          <div className="flex gap-2">
            <button onClick={addPromo} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">Ajouter</button>
            <button onClick={() => setShowAdd(false)} className="px-4 text-sm text-muted">Annuler</button>
          </div>
        </div>
      )}

      <div className="px-5">
        {promos.length === 0 && !showAdd && <EmptyState message="Aucune promo notée pour l'instant." actionLabel="Ajouter une promo" onAction={() => setShowAdd(true)} />}
        <div className="space-y-1">
          {promos.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-3 border-b border-borderLight">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink">{p.product_name} <span className="text-muted">· {p.store_name}</span></div>
                {p.note && <div className="text-xs text-muted">{p.note}</div>}
                <div className="text-[11px] text-muted">{relativeDate(p.created_at)} · {members.find((m) => m.id === p.author_id)?.first_name}</div>
              </div>
              <button onClick={() => remove(p.id)} className="text-muted"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

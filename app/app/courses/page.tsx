"use client";

import { useEffect, useState } from "react";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { ShoppingItem, Comment } from "@/lib/types";
import { relativeDate } from "@/lib/utils";
import { Check, Plus, Trash2, MessageCircle, X } from "lucide-react";

export default function CoursesPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  async function loadItems() {
    if (!household) return;
    const { data } = await supabase.from("shopping_items").select("*").eq("household_id", household.id).order("created_at", { ascending: false });
    setItems((data as ShoppingItem[]) || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (household) loadItems();
  }, [household]);

  async function addItem() {
    if (!newName.trim() || !household) return;
    await supabase.from("shopping_items").insert({ household_id: household.id, name: newName.trim(), quantity: newQty || null });
    setNewName("");
    setNewQty("");
    setShowAdd(false);
    loadItems();
  }
  async function toggle(item: ShoppingItem) {
    const status = item.status === "bought" ? "to_buy" : "bought";
    await supabase.from("shopping_items").update({ status, bought_at: status === "bought" ? new Date().toISOString() : null }).eq("id", item.id);
    loadItems();
  }
  async function remove(id: string) {
    await supabase.from("shopping_items").delete().eq("id", id);
    loadItems();
  }
  async function openItemComments(id: string) {
    setOpenComments(id);
    const { data } = await supabase.from("comments").select("*").eq("shopping_item_id", id).order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
  }
  async function addComment() {
    if (!newComment.trim() || !openComments || !me) return;
    await supabase.from("comments").insert({ household_id: household!.id, author_id: me.id, shopping_item_id: openComments, text: newComment.trim() });
    setNewComment("");
    const { data } = await supabase.from("comments").select("*").eq("shopping_item_id", openComments).order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
  }

  if (loading || !household) return <div className="p-8 text-center text-muted">Chargement…</div>;

  const toBuy = items.filter((i) => i.status === "to_buy");
  const bought = items.filter((i) => i.status === "bought");

  function memberName(id: string | null) {
    return members.find((m) => m.id === id)?.first_name;
  }

  return (
    <div>
      <div className="flex items-start justify-between px-5 pt-8 pb-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{toBuy.length} articles restants</div>
          <h1 className="font-serif text-2xl text-ink">Courses</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium">
          Ajouter
        </button>
      </div>

      {showAdd && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4 space-y-2">
          <input autoFocus placeholder="Nom de l'article" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
          <input placeholder="Quantité (facultatif)" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
          <div className="flex gap-2">
            <button onClick={addItem} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">Ajouter</button>
            <button onClick={() => setShowAdd(false)} className="px-4 text-sm text-muted">Annuler</button>
          </div>
        </div>
      )}

      <div className="px-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">À acheter</div>
        {toBuy.length === 0 && !showAdd && <EmptyState message="La liste est vide." actionLabel="Ajouter le premier article" onAction={() => setShowAdd(true)} />}
        <div className="space-y-1 mb-6">
          {toBuy.map((item) => (
            <div key={item.id} className="border-b border-borderLight py-3">
              <div className="flex items-center gap-3">
                <div onClick={() => toggle(item)} className="w-5 h-5 rounded-full border-2 border-border shrink-0 cursor-pointer" />
                <div className="flex-1 min-w-0" onClick={() => toggle(item)}>
                  <div className="text-sm text-ink cursor-pointer">{item.name} {item.quantity && <span className="text-muted">· {item.quantity}</span>}</div>
                  <div className="text-[11px] text-muted">{relativeDate(item.created_at)}{memberName(item.assigned_to) ? ` · ${memberName(item.assigned_to)}` : ""}</div>
                </div>
                <button onClick={() => openItemComments(item.id)} className="text-muted"><MessageCircle size={16} /></button>
                <button onClick={() => remove(item.id)} className="text-muted"><Trash2 size={16} /></button>
              </div>
              {openComments === item.id && (
                <div className="mt-2 ml-8 bg-white2 rounded-xl p-3">
                  {comments.length === 0 && <p className="text-xs text-muted italic">Aucun commentaire.</p>}
                  {comments.map((c) => (
                    <div key={c.id} className="text-xs mb-1"><span className="font-medium text-ink">{memberName(members.find(m=>m.id===c.author_id)?.id || "")}</span> <span className="text-muted">{c.text}</span></div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ajouter un commentaire…" className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs outline-none" />
                    <button onClick={addComment} className="text-xs bg-ink text-paper rounded-lg px-3">OK</button>
                    <button onClick={() => setOpenComments(null)} className="text-muted"><X size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {bought.length > 0 && (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Acheté</div>
            <div className="space-y-1">
              {bought.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3 border-b border-borderLight">
                  <div onClick={() => toggle(item)} className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-paper shrink-0 cursor-pointer"><Check size={12} strokeWidth={3} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-border line-through">{item.name}</div>
                    <div className="text-[11px] text-muted">{item.bought_at && relativeDate(item.bought_at)}</div>
                  </div>
                  <button onClick={() => remove(item.id)} className="text-muted"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

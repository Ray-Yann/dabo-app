"use client";

import { useEffect, useState } from "react";
import { useHousehold } from "@/lib/use-household";
import { EmptyState } from "@/components/EmptyState";
import { ShoppingItem, Comment } from "@/lib/types";
import { relativeDate, dueDateLabel } from "@/lib/utils";
import { notifyHousehold } from "@/lib/notifications";
import { Check, Plus, Trash2, MessageCircle, X, Pencil } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/lib/language-context";

type ItemForm = { name: string; quantity: string; urgent: boolean; assignedTo: string; dueDate: string };
const EMPTY_FORM: ItemForm = { name: "", quantity: "", urgent: false, assignedTo: "", dueDate: "" };

function ItemFormFields({
  form,
  setForm,
  members,
  t,
}: {
  form: ItemForm;
  setForm: (f: ItemForm) => void;
  members: { id: string; first_name: string }[];
  t: (key: string) => string;
}) {
  return (
    <>
      <input autoFocus placeholder={t("item_name_placeholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
      <input placeholder={t("quantity_placeholder")} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
      <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink">
        <option value="">{t("unassigned")}</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.first_name}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} />
        {t("mark_urgent")}
      </label>
      <div>
        <label className="text-xs text-muted block mb-1">{t("due_date_optional")}</label>
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink" />
      </div>
    </>
  );
}

export default function CoursesPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<ItemForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ItemForm>(EMPTY_FORM);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [animatingId, setAnimatingId] = useState<string | null>(null);

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
    if (!addForm.name.trim() || !household) return;
    await supabase.from("shopping_items").insert({
      household_id: household.id,
      name: addForm.name.trim(),
      quantity: addForm.quantity || null,
      urgent: addForm.urgent,
      assigned_to: addForm.assignedTo || null,
      due_date: addForm.dueDate || null,
    });
    setAddForm(EMPTY_FORM);
    setShowAdd(false);
    loadItems();
  }

  function startEdit(item: ShoppingItem) {
    setOpenComments(null);
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      quantity: item.quantity || "",
      urgent: item.urgent,
      assignedTo: item.assigned_to || "",
      dueDate: item.due_date || "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) return;
    await supabase.from("shopping_items").update({
      name: editForm.name.trim(),
      quantity: editForm.quantity || null,
      urgent: editForm.urgent,
      assigned_to: editForm.assignedTo || null,
      due_date: editForm.dueDate || null,
    }).eq("id", id);
    setEditingId(null);
    loadItems();
  }

  async function toggle(item: ShoppingItem) {
    const goingToBought = item.status !== "bought";
    if (goingToBought) {
      setAnimatingId(item.id);
      await new Promise((r) => setTimeout(r, 260));
    }
    const status = goingToBought ? "bought" : "to_buy";
    await supabase.from("shopping_items").update({ status, bought_at: status === "bought" ? new Date().toISOString() : null }).eq("id", item.id);
    setAnimatingId(null);
    if (status === "bought" && household && me) {
      notifyHousehold(household.id, me.id, "notif_item_bought", { name: me.first_name, item: item.name });
    }
    loadItems();
  }
  async function remove(id: string) {
    if (!confirm(t("confirm_delete_item"))) return;
    await supabase.from("shopping_items").delete().eq("id", id);
    loadItems();
  }
  async function openItemComments(id: string) {
    setEditingId(null);
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

  const toBuy = [...items.filter((i) => i.status === "to_buy")].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  const bought = items.filter((i) => i.status === "bought");

  function memberName(id: string | null) {
    return members.find((m) => m.id === id)?.first_name;
  }

  return (
    <div>
      <div className="flex items-start justify-between px-5 pt-8 pb-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{toBuy.length} {t("courses_remaining")}</div>
          <h1 className="font-serif text-2xl text-ink">{t("courses_title")}</h1>
        </div>
        <button onClick={() => { setEditingId(null); setShowAdd(true); }} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium">
          {t("add")}
        </button>
      </div>

      <IntroTip id="courses" text={t("intro_courses")} />

      {showAdd && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4 space-y-2">
          <ItemFormFields form={addForm} setForm={setAddForm} members={members} t={t} />
          <div className="flex gap-2">
            <button onClick={addItem} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">{t("add")}</button>
            <button onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }} className="px-4 text-sm text-muted">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="px-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{t("courses_to_buy")}</div>
        {toBuy.length === 0 && !showAdd && <EmptyState message={t("courses_empty")} actionLabel={t("courses_add_first")} onAction={() => setShowAdd(true)} />}
        <div className="space-y-1 mb-6">
          {toBuy.map((item) => (
            <div key={item.id} className="border-b border-borderLight py-3">
              {editingId === item.id ? (
                <div className="bg-white2 rounded-xl p-3 space-y-2">
                  <ItemFormFields form={editForm} setForm={setEditForm} members={members} t={t} />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(item.id)} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">{t("save")}</button>
                    <button onClick={() => setEditingId(null)} className="px-4 text-sm text-muted">{t("cancel")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div onClick={() => toggle(item)} className={`w-5 h-5 rounded-full border-2 border-border shrink-0 cursor-pointer ${animatingId === item.id ? "bg-ink border-ink animate-check-pop" : ""}`} />
                  <div className="flex-1 min-w-0" onClick={() => toggle(item)}>
                    <div className="text-sm text-ink cursor-pointer flex items-center gap-1.5">
                      {item.urgent && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title={t("urgent_label")} />}
                      {item.name} {item.quantity && <span className="text-muted">· {item.quantity}</span>}
                    </div>
                    <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                      <span>{relativeDate(item.created_at)}{item.due_date ? ` · ${dueDateLabel(item.due_date, t)}` : ""}</span>
                      {item.assigned_to && <Avatar member={members.find((m) => m.id === item.assigned_to) || null} members={members} size={16} />}
                    </div>
                  </div>
                  <button onClick={() => startEdit(item)} className="text-muted"><Pencil size={16} /></button>
                  <button onClick={() => openItemComments(item.id)} className="text-muted"><MessageCircle size={16} /></button>
                  <button onClick={() => remove(item.id)} className="text-muted"><Trash2 size={16} /></button>
                </div>
              )}
              {openComments === item.id && (
                <div className="mt-2 ml-8 bg-white2 rounded-xl p-3">
                  {comments.length === 0 && <p className="text-xs text-muted italic">{t("comments_none")}</p>}
                  {comments.map((c) => (
                    <div key={c.id} className="text-xs mb-1"><span className="font-medium text-ink">{memberName(members.find(m=>m.id===c.author_id)?.id || "")}</span> <span className="text-muted">{c.text}</span></div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={t("comment_placeholder")} className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs outline-none" />
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
            <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{t("courses_bought")}</div>
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

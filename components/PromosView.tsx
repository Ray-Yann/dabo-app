"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { IntroTip } from "@/components/IntroTip";
import { Household, Member, Promo, PromoComment } from "@/lib/types";
import { relativeDate } from "@/lib/utils";
import { MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import { useT } from "@/lib/language-context";
import { SupabaseClient } from "@supabase/supabase-js";

export function PromosView({
  household,
  me,
  supabase,
}: {
  household: Household;
  me: Member | null;
  members: Member[];
  supabase: SupabaseClient;
}) {
  const t = useT();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [comments, setComments] = useState<Record<string, PromoComment[]>>({});
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [product, setProduct] = useState("");
  const [store, setStore] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadCommunity() {
    const { data: promoData } = await supabase
      .from("promos")
      .select("*")
      .order("created_at", { ascending: false });
    const loadedPromos = (promoData as Promo[]) || [];
    setPromos(loadedPromos);

    if (loadedPromos.length === 0) {
      setComments({});
      return;
    }

    const { data: commentData } = await supabase
      .from("promo_comments")
      .select("*")
      .in("promo_id", loadedPromos.map((promo) => promo.id))
      .order("created_at", { ascending: true });
    const grouped: Record<string, PromoComment[]> = {};
    for (const comment of (commentData as PromoComment[]) || []) {
      (grouped[comment.promo_id] ||= []).push(comment);
    }
    setComments(grouped);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCommunity();
  }, [household.id]);

  async function addPromo() {
    if (!product.trim() || !store.trim() || !me) return;
    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("promos").insert({
      household_id: household.id,
      author_id: me.id,
      author_name: me.first_name,
      product_name: product.trim(),
      store_name: store.trim(),
      note: note.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError(t("promos_save_error"));
      return;
    }
    closeForm();
    loadCommunity();
  }

  function startEdit(promo: Promo) {
    setEditingId(promo.id);
    setProduct(promo.product_name);
    setStore(promo.store_name);
    setNote(promo.note || "");
    setShowAdd(true);
    setError("");
  }

  function closeForm() {
    setShowAdd(false);
    setEditingId(null);
    setProduct("");
    setStore("");
    setNote("");
    setError("");
  }

  async function saveEdit() {
    if (!editingId || !product.trim() || !store.trim()) return;
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase
      .from("promos")
      .update({ product_name: product.trim(), store_name: store.trim(), note: note.trim() || null })
      .eq("id", editingId);
    setSaving(false);
    if (updateError) {
      setError(t("promos_save_error"));
      return;
    }
    closeForm();
    loadCommunity();
  }

  async function removePromo(id: string) {
    const { error: deleteError } = await supabase.from("promos").delete().eq("id", id);
    if (deleteError) setError(t("promos_delete_error"));
    else loadCommunity();
  }

  async function addComment(promoId: string) {
    if (!commentText.trim() || !me) return;
    setSaving(true);
    setError("");
    const { error: commentError } = await supabase.from("promo_comments").insert({
      promo_id: promoId,
      household_id: household.id,
      author_id: me.id,
      author_name: me.first_name,
      text: commentText.trim(),
    });
    setSaving(false);
    if (commentError) {
      setError(t("promos_comment_error"));
      return;
    }
    setCommentText("");
    loadCommunity();
  }

  async function removeComment(id: string) {
    const { error: deleteError } = await supabase.from("promo_comments").delete().eq("id", id);
    if (deleteError) setError(t("promos_comment_delete_error"));
    else loadCommunity();
  }

  return (
    <div>
      <div className="flex items-start justify-between px-5 pt-4 pb-2">
        <p className="text-xs text-muted flex-1 pr-3">{t("promos_subtitle")}</p>
        <button onClick={() => { closeForm(); setShowAdd(true); }} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium shrink-0">
          {t("add")}
        </button>
      </div>
      <IntroTip id="promos" text={t("intro_promos")} />

      {showAdd && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4 space-y-2">
          {editingId && <p className="text-sm font-medium text-ink">{t("promos_edit_title")}</p>}
          <input autoFocus placeholder={t("product_placeholder")} value={product} onChange={(e) => setProduct(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink" />
          <input placeholder={t("store_placeholder")} value={store} onChange={(e) => setStore(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink" />
          <input placeholder={t("note_placeholder")} value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink" />
          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button disabled={saving || !product.trim() || !store.trim()} onClick={editingId ? saveEdit : addPromo} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium disabled:opacity-50">{saving ? "…" : editingId ? t("save") : t("add")}</button>
            <button onClick={closeForm} className="px-4 text-sm text-muted">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="px-5">
        {error && !showAdd && <p className="mb-3 text-xs text-red-600" role="alert">{error}</p>}
        {promos.length === 0 && !showAdd && <EmptyState message={t("promos_empty")} actionLabel={t("promos_add_first")} onAction={() => setShowAdd(true)} />}
        <div className="space-y-2">
          {promos.map((promo) => {
            const promoComments = comments[promo.id] || [];
            const isAuthor = promo.author_id === me?.id;
            const commentsOpen = openCommentsId === promo.id;
            return (
              <article key={promo.id} className="py-3 border-b border-borderLight">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink">{promo.product_name} <span className="text-muted">· {promo.store_name}</span></div>
                    {promo.note && <div className="text-xs text-muted mt-0.5">{promo.note}</div>}
                    <div className="text-[11px] text-muted mt-1">{relativeDate(promo.created_at)} · {promo.author_name}</div>
                  </div>
                  {isAuthor && <button onClick={() => startEdit(promo)} className="text-muted p-1" aria-label={t("edit")} title={t("edit")}><Pencil size={16} /></button>}
                  {isAuthor && <button onClick={() => removePromo(promo.id)} className="text-muted p-1" aria-label={t("delete")} title={t("delete")}><Trash2 size={16} /></button>}
                </div>

                <button
                  onClick={() => { setOpenCommentsId(commentsOpen ? null : promo.id); setCommentText(""); setError(""); }}
                  className="mt-2 flex items-center gap-1.5 text-xs text-accent"
                >
                  <MessageCircle size={14} />
                  {promoComments.length === 0 ? t("promos_add_update") : t("promos_updates_count").replace("{count}", String(promoComments.length))}
                </button>

                {commentsOpen && (
                  <div className="mt-3 ml-3 pl-3 border-l border-border space-y-3">
                    {promoComments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink whitespace-pre-wrap break-words">{comment.text}</p>
                          <p className="text-[11px] text-muted mt-0.5">{comment.author_name} · {relativeDate(comment.created_at)}</p>
                        </div>
                        {comment.author_id === me?.id && (
                          <button onClick={() => removeComment(comment.id)} className="text-muted p-1" aria-label={t("delete")}><Trash2 size={14} /></button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 items-center">
                      <input
                        value={commentText}
                        maxLength={500}
                        onChange={(event) => setCommentText(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) addComment(promo.id); }}
                        placeholder={t("promos_update_placeholder")}
                        className="flex-1 min-w-0 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-ink bg-white2 text-ink"
                      />
                      <button disabled={saving || !commentText.trim()} onClick={() => addComment(promo.id)} className="bg-ink text-paper rounded-xl p-2 disabled:opacity-50" aria-label={t("send")}>
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

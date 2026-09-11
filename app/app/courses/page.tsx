"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { EmptyState } from "@/components/EmptyState";
import { ShoppingItem, Comment } from "@/lib/types";
import { relativeDate, dueDateLabel, todayCivilDate } from "@/lib/utils";
import { notifyHousehold } from "@/lib/notifications";
import { Check, Plus, Trash2, MessageCircle, X, Pencil, Sparkles, MoreHorizontal, Store } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/lib/language-context";
import { trackAcquisitionEvent } from "@/lib/acquisition";
import { generateShoppingSuggestions, type ShoppingSuggestionPreference } from "@/lib/dabo-shopping-engine";
import { SmartNameInput } from "@/components/SmartNameInput";
import { shoppingSessionPromptEligible, type ShoppingFinanceSession } from "@/lib/shopping-finance";
import { VERIFIED_STORE_SUPPLEMENTS } from "@/lib/world-store-catalog";

type HouseholdStore = { id: string; name: string };
type ItemForm = { name: string; quantity: string; urgent: boolean; assignedTo: string; dueDate: string; store: string; customStore: string };
const EMPTY_FORM: ItemForm = { name: "", quantity: "", urgent: false, assignedTo: "", dueDate: "", store: "", customStore: "" };
const OTHER_STORE = "__other__";

function ItemFormFields({
  form,
  setForm,
  members,
  t,
  nameSuggestions,
  stores,
}: {
  form: ItemForm;
  setForm: (f: ItemForm) => void;
  members: { id: string; first_name: string }[];
  t: (key: string) => string;
  nameSuggestions: string[];
  stores: string[];
}) {
  return (
    <>
      <SmartNameInput domain="courses" autoFocus placeholder={t("item_name_placeholder")} value={form.name} onChange={(name) => setForm({ ...form, name })} learnedTerms={nameSuggestions} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-ink bg-white2 text-ink" />
      <div className="rounded-xl bg-paper/60 p-3 space-y-2">
        <div className="text-[11px] font-medium text-muted">{t("courses_optional_details")}</div>
        <input placeholder={t("quantity_placeholder")} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink" />
        <div>
          <label className="text-xs text-muted block mb-1">{t("courses_store_optional")}</label>
          <select value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value, customStore: e.target.value === OTHER_STORE ? form.customStore : "" })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink">
            <option value="">{t("courses_store_none")}</option>
            {stores.map((store) => <option key={store.toLocaleLowerCase()} value={store}>{store}</option>)}
            <option value={OTHER_STORE}>{t("courses_store_other")}</option>
          </select>
          {form.store === OTHER_STORE && (
            <input autoFocus placeholder={t("courses_store_custom_placeholder")} value={form.customStore} onChange={(e) => setForm({ ...form, customStore: e.target.value })} className="mt-2 w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink" />
          )}
        </div>
        <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink">
          <option value="">{t("unassigned")}</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.first_name}</option>)}
        </select>
        <div>
          <label className="text-xs text-muted block mb-1">{t("due_date_optional")}</label>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink" />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} />
          {t("mark_urgent")}
        </label>
      </div>
    </>
  );
}

export default function CoursesPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const [view, setView] = useState<"to_buy" | "suggestions" | "history">("to_buy");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [taskNameSuggestions, setTaskNameSuggestions] = useState<string[]>([]);
  const [householdStores, setHouseholdStores] = useState<HouseholdStore[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<ItemForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ItemForm>(EMPTY_FORM);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [boughtSearch, setBoughtSearch] = useState("");
  const [showAllBought, setShowAllBought] = useState(false);
  const [addConfirmation, setAddConfirmation] = useState(false);
  const [boughtConfirmation, setBoughtConfirmation] = useState(false);
  const [suggestionPreferences, setSuggestionPreferences] = useState<ShoppingSuggestionPreference[]>([]);
  const [handledSuggestionKeys, setHandledSuggestionKeys] = useState<string[]>([]);
  const [suggestionsHandledThisVisit, setSuggestionsHandledThisVisit] = useState(0);
  const [suggestionBusy, setSuggestionBusy] = useState(false);
  const [suggestionMenuOpen, setSuggestionMenuOpen] = useState(false);
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const headerAddButtonRef = useRef<HTMLButtonElement | null>(null);
  const [headerAddButtonVisible, setHeaderAddButtonVisible] = useState(true);
  const [shoppingFinanceSession, setShoppingFinanceSession] = useState<ShoppingFinanceSession | null>(null);
  const [shoppingFinanceAmount, setShoppingFinanceAmount] = useState("");
  const [shoppingFinancePayer, setShoppingFinancePayer] = useState("");
  const [shoppingFinanceBusy, setShoppingFinanceBusy] = useState(false);
  const [shoppingFinanceError, setShoppingFinanceError] = useState("");
  const [shoppingFinanceSaved, setShoppingFinanceSaved] = useState(false);

  useEffect(() => {
    const button = headerAddButtonRef.current;
    if (!button) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHeaderAddButtonVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  async function loadShoppingFinancePrompt() {
    if (!household) return;
    const { data, error } = await supabase
      .from("shopping_sessions")
      .select("id,household_id,shopper_member_id,first_bought_at,last_bought_at,item_count,state,total_amount,finance_transaction_id,prompted_at")
      .eq("household_id", household.id)
      .eq("state", "pending")
      .order("last_bought_at", { ascending: false })
      .limit(10);
    if (error) return;
    const eligible = ((data || []) as ShoppingFinanceSession[]).find((session) => shoppingSessionPromptEligible(session, new Date()));
    setShoppingFinanceSession(eligible || null);
    if (eligible && !shoppingFinancePayer && me) setShoppingFinancePayer(me.id);
  }

  async function recordShoppingFinance() {
    if (!shoppingFinanceSession || !shoppingFinancePayer) return;
    const normalized = shoppingFinanceAmount.replace(/\s/g, "").replace("€", "").replace(",", ".");
    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0) {
      setShoppingFinanceError(t("courses_finance_amount_error"));
      return;
    }
    setShoppingFinanceBusy(true);
    setShoppingFinanceError("");
    const { error } = await supabase.rpc("dabo_record_shopping_session_expense", {
      p_session_id: shoppingFinanceSession.id,
      p_amount: Math.round(value * 100) / 100,
      p_paid_by_member_id: shoppingFinancePayer,
    });
    setShoppingFinanceBusy(false);
    if (error) {
      console.error(error);
      setShoppingFinanceError(t("courses_finance_save_error"));
      return;
    }
    setShoppingFinanceSession(null);
    setShoppingFinanceAmount("");
    setShoppingFinanceSaved(true);
    window.setTimeout(() => setShoppingFinanceSaved(false), 2600);
  }

  async function postponeShoppingFinance() {
    if (!shoppingFinanceSession) return;
    await supabase.from("shopping_sessions").update({ prompted_at: new Date().toISOString() }).eq("id", shoppingFinanceSession.id);
    setShoppingFinanceSession(null);
    setShoppingFinanceAmount("");
    setShoppingFinanceError("");
  }

  async function dismissShoppingFinance() {
    if (!shoppingFinanceSession) return;
    await supabase.from("shopping_sessions").update({ state: "dismissed", prompted_at: new Date().toISOString() }).eq("id", shoppingFinanceSession.id);
    setShoppingFinanceSession(null);
    setShoppingFinanceAmount("");
    setShoppingFinanceError("");
  }

  async function loadItems() {
    if (!household) return;
    const [{ data: itemData }, { data: preferenceData }, { data: taskNameData }, { data: storeData }] = await Promise.all([
      supabase.from("shopping_items").select("*").eq("household_id", household.id).order("created_at", { ascending: false }),
      supabase.from("shopping_suggestion_preferences").select("*").eq("household_id", household.id),
      supabase.from("tasks").select("name").eq("household_id", household.id).limit(200),
      supabase.from("household_stores").select("id,name").eq("household_id", household.id).order("name"),
    ]);
    setItems((itemData as ShoppingItem[]) || []);
    setSuggestionPreferences((preferenceData as ShoppingSuggestionPreference[]) || []);
    setTaskNameSuggestions((taskNameData || []).map((row: { name: string }) => row.name));
    setHouseholdStores((storeData as HouseholdStore[]) || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (household) loadItems();
  }, [household]);

  useEffect(() => {
    if (!household) return;
    void loadShoppingFinancePrompt();
    const timer = window.setInterval(() => void loadShoppingFinancePrompt(), 60_000);
    return () => window.clearInterval(timer);
  }, [household?.id, me?.id]);

  function availableStores() {
    const byKey = new Map<string, string>();
    // UX Light V1.2.1: menu strict — uniquement le catalogue national DABO vérifié,
    // puis les magasins personnels déjà appris par ce foyer. La source mondiale/NSI
    // reste disponible côté serveur pour de futurs enrichissements, mais n'alimente
    // jamais directement le sélecteur Courses.
    [...(VERIFIED_STORE_SUPPLEMENTS[household?.country_code || "BE"] || []), ...householdStores.map((store) => store.name)].forEach((name) => {
      const clean = name.trim();
      const key = clean.toLocaleLowerCase();
      if (clean && !byKey.has(key)) byKey.set(key, clean);
    });
    return [...byKey.values()];
  }

  function resolvedStore(form: ItemForm) {
    return (form.store === OTHER_STORE ? form.customStore : form.store).trim();
  }

  async function rememberStore(name: string) {
    if (!household || !name) return;
    const alreadyKnown = householdStores.some((store) => store.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
    if (alreadyKnown) return;
    // Un magasin saisi manuellement est personnel au foyer. Il ne devient pas
    // automatiquement une recommandation nationale pour les autres foyers.
    await supabase.from("household_stores").insert({ household_id: household.id, name });
  }

  async function addItem() {
    if (!addForm.name.trim() || !household) return;
    const storeName = resolvedStore(addForm);
    if (addForm.store === OTHER_STORE && !storeName) return;
    if (storeName) await rememberStore(storeName);
    const { error: shoppingInsertError } = await supabase.from("shopping_items").insert({
      household_id: household.id,
      name: addForm.name.trim(),
      quantity: addForm.quantity || null,
      urgent: addForm.urgent,
      assigned_to: addForm.assignedTo || null,
      due_date: addForm.dueDate || null,
      store_name: storeName || null,
    });
    if (!shoppingInsertError) void trackAcquisitionEvent("first_value", { householdId: household.id, valueType: "shopping" });
    if (addForm.urgent && me) {
      notifyHousehold(supabase, household.id, me.id, "notif_item_urgent", { name: me.first_name, item: addForm.name.trim() });
    }
    setAddForm(EMPTY_FORM);
    setShowAdd(false);
    setAddConfirmation(true);
    window.setTimeout(() => setAddConfirmation(false), 2200);
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
      store: item.store_name || "",
      customStore: "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) return;
    const wasUrgent = items.find((i) => i.id === id)?.urgent || false;
    const storeName = resolvedStore(editForm);
    if (editForm.store === OTHER_STORE && !storeName) return;
    if (storeName) await rememberStore(storeName);
    await supabase.from("shopping_items").update({
      name: editForm.name.trim(),
      quantity: editForm.quantity || null,
      urgent: editForm.urgent,
      assigned_to: editForm.assignedTo || null,
      due_date: editForm.dueDate || null,
      store_name: storeName || null,
    }).eq("id", id);
    if (editForm.urgent && !wasUrgent && household && me) {
      notifyHousehold(supabase, household.id, me.id, "notif_item_urgent", { name: me.first_name, item: editForm.name.trim() });
    }
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
    const { error } = await supabase.rpc("dabo_set_shopping_item_status", { p_item_id: item.id, p_status: status });
    setAnimatingId(null);
    if (error) return;
    if (status === "bought") {
      setBoughtConfirmation(true);
      window.setTimeout(() => setBoughtConfirmation(false), 2200);
      if (household && me) {
        notifyHousehold(supabase, household.id, me.id, "notif_item_bought", { name: me.first_name, item: item.name });
      }
    }
    loadItems();
    void loadShoppingFinancePrompt();
  }
  async function remove(id: string) {
    if (!confirm(t("confirm_delete_item"))) return;
    const item = items.find((candidate) => candidate.id === id);

    if (household && item?.status === "to_buy" && item.dabo_suggestion_product_key) {
      const productKey = item.dabo_suggestion_product_key;
      const preference = preferenceFor(productKey);
      const now = new Date().toISOString();

      await supabase.from("shopping_suggestion_preferences").upsert({
        household_id: household.id,
        product_key: productKey,
        last_label: item.name.trim(),
        dismiss_count: preference?.dismiss_count ?? 0,
        snoozed_until: preference?.snoozed_until ?? null,
        disabled: preference?.disabled ?? false,
        accepted_count: preference?.accepted_count ?? 0,
        removed_without_purchase_count: (preference?.removed_without_purchase_count ?? 0) + 1,
        last_suggested_at: preference?.last_suggested_at ?? null,
        last_accepted_at: preference?.last_accepted_at ?? null,
        last_dismissed_at: preference?.last_dismissed_at ?? null,
        updated_at: now,
      }, { onConflict: "household_id,product_key" });
    }

    await supabase.from("shopping_items").delete().eq("id", id);
    loadItems();
  }
  async function reloadComments(itemId: string) {
    const { data } = await supabase.from("comments").select("*").eq("shopping_item_id", itemId).order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
  }
  async function openItemComments(id: string) {
    setEditingId(null);
    setOpenComments(id);
    reloadComments(id);
  }
  async function addComment() {
    if (!newComment.trim() || !openComments || !me) return;
    await supabase.from("comments").insert({ household_id: household!.id, author_id: me.id, shopping_item_id: openComments, text: newComment.trim() });
    setNewComment("");
    reloadComments(openComments);
  }
  async function saveEditComment(id: string) {
    if (!editCommentText.trim() || !openComments) return;
    await supabase.from("comments").update({ text: editCommentText.trim() }).eq("id", id);
    setEditingCommentId(null);
    reloadComments(openComments);
  }
  async function deleteComment(id: string) {
    if (!confirm(t("confirm_delete_comment")) || !openComments) return;
    await supabase.from("comments").delete().eq("id", id);
    reloadComments(openComments);
  }

  function preferenceFor(productKey: string) {
    return suggestionPreferences.find((preference) => preference.product_key === productKey);
  }

  function markSuggestionHandled(productKey: string) {
    setHandledSuggestionKeys((current) => current.includes(productKey) ? current : [...current, productKey]);
    setSuggestionsHandledThisVisit((count) => count + 1);
  }

  async function acceptShoppingSuggestion(productKey: string, label: string) {
    if (!household || suggestionBusy) return;
    setSuggestionBusy(true);
    const preference = preferenceFor(productKey);
    const now = new Date().toISOString();

    const { error: itemError } = await supabase.from("shopping_items").insert({
      household_id: household.id,
      name: label,
      quantity: null,
      urgent: false,
      assigned_to: null,
      due_date: null,
      dabo_suggestion_product_key: productKey,
    });

    if (!itemError) {
      await supabase.from("shopping_suggestion_preferences").upsert({
        household_id: household.id,
        product_key: productKey,
        last_label: label,
        dismiss_count: preference?.dismiss_count ?? 0,
        snoozed_until: null,
        disabled: preference?.disabled ?? false,
        accepted_count: (preference?.accepted_count ?? 0) + 1,
        removed_without_purchase_count: preference?.removed_without_purchase_count ?? 0,
        last_suggested_at: now,
        last_accepted_at: now,
        last_dismissed_at: preference?.last_dismissed_at ?? null,
        updated_at: now,
      }, { onConflict: "household_id,product_key" });
      markSuggestionHandled(productKey);
      await loadItems();
    }
    setSuggestionBusy(false);
  }

  async function disableShoppingSuggestion(productKey: string, label: string) {
    if (!household || suggestionBusy) return;
    setSuggestionBusy(true);
    const preference = preferenceFor(productKey);
    const now = new Date().toISOString();

    const { error } = await supabase.from("shopping_suggestion_preferences").upsert({
      household_id: household.id,
      product_key: productKey,
      last_label: label,
      dismiss_count: preference?.dismiss_count ?? 0,
      snoozed_until: null,
      disabled: true,
      accepted_count: preference?.accepted_count ?? 0,
      removed_without_purchase_count: preference?.removed_without_purchase_count ?? 0,
      last_suggested_at: now,
      last_accepted_at: preference?.last_accepted_at ?? null,
      last_dismissed_at: preference?.last_dismissed_at ?? null,
      updated_at: now,
    }, { onConflict: "household_id,product_key" });

    if (!error) {
      setSuggestionMenuOpen(false);
      markSuggestionHandled(productKey);
      await loadItems();
    }
    setSuggestionBusy(false);
  }

  async function dismissShoppingSuggestion(productKey: string, label: string, nextSuggestionDate: string) {
    if (!household || suggestionBusy) return;
    setSuggestionBusy(true);
    const preference = preferenceFor(productKey);
    const now = new Date().toISOString();
    const snoozedUntil = `${nextSuggestionDate}T00:00:00.000Z`;

    await supabase.from("shopping_suggestion_preferences").upsert({
      household_id: household.id,
      product_key: productKey,
      last_label: label,
      dismiss_count: (preference?.dismiss_count ?? 0) + 1,
      snoozed_until: snoozedUntil,
      disabled: preference?.disabled ?? false,
      accepted_count: preference?.accepted_count ?? 0,
      removed_without_purchase_count: preference?.removed_without_purchase_count ?? 0,
      last_suggested_at: now,
      last_accepted_at: preference?.last_accepted_at ?? null,
      last_dismissed_at: now,
      updated_at: now,
    }, { onConflict: "household_id,product_key" });

    markSuggestionHandled(productKey);
    await loadItems();
    setSuggestionBusy(false);
  }

  if (loading || !household) return <LoadingState />;

  const toBuy = [...items.filter((i) => i.status === "to_buy")].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  const toBuyGroups = (() => {
    const groups = new Map<string, ShoppingItem[]>();
    for (const item of toBuy) {
      const label = item.store_name?.trim() || t("courses_store_none_group");
      groups.set(label, [...(groups.get(label) || []), item]);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === t("courses_store_none_group")) return 1;
      if (b === t("courses_store_none_group")) return -1;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  })();
  const hasBoughtItems = items.some((i) => i.status === "bought");
  const allBought = items
    .filter((i) => i.status === "bought")
    .filter((i) => i.name.toLowerCase().includes(boughtSearch.toLowerCase()))
    .sort((a, b) => new Date(b.bought_at || 0).getTime() - new Date(a.bought_at || 0).getTime());
  const bought = showAllBought ? allBought : allBought.slice(0, 3);

  const boughtGroups = (() => {
    if (!showAllBought) return [{ label: "", items: bought }];
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const startWeek = new Date(startToday);
    const mondayOffset = (startWeek.getDay() + 6) % 7;
    startWeek.setDate(startWeek.getDate() - mondayOffset);
    const groups = [
      { key: "courses_history_today", items: [] as ShoppingItem[] },
      { key: "courses_history_yesterday", items: [] as ShoppingItem[] },
      { key: "courses_history_week", items: [] as ShoppingItem[] },
      { key: "courses_history_older", items: [] as ShoppingItem[] },
    ];
    for (const item of bought) {
      const date = new Date(item.bought_at || item.created_at);
      if (date >= startToday) groups[0].items.push(item);
      else if (date >= startYesterday) groups[1].items.push(item);
      else if (date >= startWeek) groups[2].items.push(item);
      else groups[3].items.push(item);
    }
    return groups.filter((group) => group.items.length > 0).map((group) => ({ label: t(group.key), items: group.items }));
  })();
  const shoppingSuggestions = suggestionsHandledThisVisit >= 3
    ? []
    : generateShoppingSuggestions({ items, preferences: suggestionPreferences, today: todayCivilDate() })
        .filter((suggestion) => !handledSuggestionKeys.includes(suggestion.productKey));
  const shoppingSuggestion = shoppingSuggestions[0] ?? null;

  function memberName(id: string | null) {
    return members.find((m) => m.id === id)?.first_name;
  }

  return (
    <div>
      <div className="dabo-organic-header flex items-start justify-between px-5 pt-8 pb-4">
        <div className="relative z-[1]">
          <div className="dabo-brand-orbit" aria-hidden="true"><span className="dabo-brand-leaf dabo-brand-leaf-a" /><span className="dabo-brand-leaf dabo-brand-leaf-b" /><span className="dabo-brand-sun" /></div>
          <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{toBuy.length} {t("courses_remaining")}</div>
          <h1 className="font-serif text-2xl text-ink">{t("courses_title")}</h1>
        </div>
        <button ref={headerAddButtonRef} onClick={() => { setEditingId(null); setShowAdd(true); }} className="dabo-primary-action bg-ink text-paper px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5">
          <Plus size={15} /> {t("add")}
        </button>
      </div>

      <IntroTip id="courses" title={t("intro_courses_title")} text={t("intro_courses")} />

      {shoppingFinanceSaved && (
        <div className="mx-5 mb-4 rounded-2xl border border-borderLight bg-white2 px-4 py-3 text-sm font-medium text-ink">
          {t("courses_finance_saved")}
        </div>
      )}

      {shoppingFinanceSession && (
        <section className="mx-5 mb-4 rounded-3xl border border-borderLight bg-paper p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("courses_finance_eyebrow")}</div>
          <h2 className="mt-1 font-serif text-xl text-ink">{t("courses_finance_title")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {t("courses_finance_intro").replace("{count}", String(shoppingFinanceSession.item_count))}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted">
              {t("courses_finance_amount_label")}
              <input
                inputMode="decimal"
                value={shoppingFinanceAmount}
                onChange={(e) => setShoppingFinanceAmount(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full rounded-xl border border-border bg-white2 px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="text-xs text-muted">
              {t("courses_finance_paid_by")}
              <select
                value={shoppingFinancePayer}
                onChange={(e) => setShoppingFinancePayer(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white2 px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
              >
                {members.map((member) => <option key={member.id} value={member.id}>{member.first_name}{member.id === me?.id ? ` (${t("me")})` : ""}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">{t("courses_finance_amount_hint")}</p>
          {shoppingFinanceError && <p className="mt-2 text-xs font-medium text-red-700">{shoppingFinanceError}</p>}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
            <button disabled={shoppingFinanceBusy} onClick={recordShoppingFinance} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">{shoppingFinanceBusy ? t("scan_saving") : t("courses_finance_record")}</button>
            <button disabled={shoppingFinanceBusy} onClick={postponeShoppingFinance} className="rounded-xl border border-borderLight px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50">{t("courses_finance_later")}</button>
            <button disabled={shoppingFinanceBusy} onClick={dismissShoppingFinance} className="rounded-xl px-3 py-2.5 text-sm text-muted disabled:opacity-50">{t("courses_finance_skip")}</button>
          </div>
        </section>
      )}

      {view === "suggestions" && shoppingSuggestion && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-mustardBg flex items-center justify-center shrink-0">
              <Sparkles size={17} className="text-mustard" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink mb-1">{t("dabo_shopping_thought")}</div>
              <p className="text-sm text-ink leading-snug">
                {t("dabo_shopping_suggestion").replace("{product}", shoppingSuggestion.label)}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  type="button"
                  disabled={suggestionBusy}
                  onClick={() => acceptShoppingSuggestion(shoppingSuggestion.productKey, shoppingSuggestion.label)}
                  className="bg-ink text-paper rounded-xl px-3.5 py-2 text-xs font-medium disabled:opacity-50"
                >
                  {t("dabo_shopping_add")}
                </button>
                <button
                  type="button"
                  disabled={suggestionBusy}
                  onClick={() => dismissShoppingSuggestion(
                    shoppingSuggestion.productKey,
                    shoppingSuggestion.label,
                    new Date(Date.UTC(
                      Number(shoppingSuggestion.expectedOn.slice(0, 4)),
                      Number(shoppingSuggestion.expectedOn.slice(5, 7)) - 1,
                      Number(shoppingSuggestion.expectedOn.slice(8, 10)) + shoppingSuggestion.rhythmDays - 2
                    )).toISOString().slice(0, 10)
                  )}
                  className="px-2 py-2 text-xs font-medium text-muted disabled:opacity-50"
                >
                  {t("dabo_shopping_not_now")}
                </button>
                <div className="relative ml-auto">
                  <button
                    type="button"
                    disabled={suggestionBusy}
                    onClick={() => setSuggestionMenuOpen((open) => !open)}
                    aria-label={t("dabo_shopping_more_options")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-paper disabled:opacity-50"
                  >
                    <MoreHorizontal size={17} />
                  </button>
                  {suggestionMenuOpen && (
                    <div className="absolute right-0 top-9 z-10 w-56 rounded-xl border border-border bg-white2 p-1.5 shadow-lg">
                      <button
                        type="button"
                        disabled={suggestionBusy}
                        onClick={() => disableShoppingSuggestion(shoppingSuggestion.productKey, shoppingSuggestion.label)}
                        className="w-full rounded-lg px-3 py-2 text-left text-xs text-ink hover:bg-paper disabled:opacity-50"
                      >
                        {t("dabo_shopping_never_suggest")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 mb-5">
        <label className="block text-sm font-medium text-muted mb-2">{t("ux_view_label")}</label>
        <select value={view} onChange={(e) => setView(e.target.value as "to_buy" | "suggestions" | "history")} className="w-full rounded-2xl border border-borderLight bg-paper px-4 py-3 text-base font-semibold text-ink outline-none focus:border-ink">
          <option value="to_buy">{t("ux_courses_to_buy")}</option>
          <option value="suggestions">{t("ux_courses_suggestions")}</option>
          <option value="history">{t("ux_history")}</option>
        </select>
      </div>

      {view === "suggestions" && !shoppingSuggestion && (
        <div className="mx-5 rounded-3xl border border-borderLight bg-white2 p-6 text-center text-sm text-muted">{t("courses_empty")}</div>
      )}

      {view === "to_buy" && (<>
      {showAdd && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold text-ink">{t("courses_add_question")}</div>
            <div className="text-xs text-muted mt-0.5">{t("courses_add_hint")}</div>
          </div>
          <ItemFormFields form={addForm} setForm={setAddForm} members={members} t={t} nameSuggestions={[...items.map((item) => item.name), ...taskNameSuggestions]} stores={availableStores()} />
          <div className="flex gap-2">
            <button onClick={addItem} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">{t("add")}</button>
            <button onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }} className="px-4 text-sm text-muted">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="px-5">
        {toBuy.length === 0 && !showAdd && <EmptyState message={`${t("courses_empty_title")} ${t("courses_empty")}`} actionLabel={t("courses_add_first")} onAction={() => setShowAdd(true)} />}
        <div className="space-y-1 mb-6">
          {toBuyGroups.map(([storeLabel, storeItems]) => (
            <div key={storeLabel} className="mb-4">
              <div className="dabo-store-heading sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-paper/95 px-1 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted"><span className="dabo-store-heading-icon"><Store size={13} /></span><span>{storeLabel}</span></div>
              {storeItems.map((item) => (
            <div key={item.id} className="border-b border-borderLight py-3">
              {editingId === item.id ? (
                <div className="bg-white2 rounded-xl p-3 space-y-2">
                  <ItemFormFields form={editForm} setForm={setEditForm} members={members} t={t} nameSuggestions={[...items.map((item) => item.name), ...taskNameSuggestions]} stores={availableStores()} />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(item.id)} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">{t("save")}</button>
                    <button onClick={() => setEditingId(null)} className="px-4 text-sm text-muted">{t("cancel")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div onClick={() => toggle(item)} className={`w-5 h-5 rounded-full border-2 border-border shrink-0 cursor-pointer ${animatingId === item.id ? "bg-ink border-ink animate-check-pop" : ""}`} />
                  <div className="flex-1 min-w-0" onClick={() => toggle(item)}>
                    <div className="text-sm text-ink cursor-pointer flex flex-wrap items-center gap-1.5">
                      <span>{item.name}</span>
                      {item.quantity && <span className="text-muted">· {item.quantity}</span>}
                      {item.urgent && <span className="rounded-full bg-mustardBg px-2 py-0.5 text-[10px] font-semibold text-mustard">{t("urgent_label")}</span>}
                      {item.store_name && <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium text-muted">{item.store_name}</span>}
                    </div>
                    {(item.assigned_to || item.due_date) && (
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        {item.assigned_to && (
                          <>
                            <Avatar member={members.find((m) => m.id === item.assigned_to) || null} members={members} size={16} />
                            <span>{t("courses_for_member").replace("{member}", memberName(item.assigned_to) || "")}</span>
                          </>
                        )}
                        {item.assigned_to && item.due_date && <span>·</span>}
                        {item.due_date && <span>{dueDateLabel(item.due_date, t)}</span>}
                      </div>
                    )}
                  </div>
                  <button onClick={() => startEdit(item)} className="text-muted" aria-label={t("edit")}><Pencil size={16} /></button>
                  <button onClick={() => setActionItemId(item.id)} className="text-muted" aria-label={t("courses_item_more_actions")}><MoreHorizontal size={18} /></button>
                </div>
              )}
              {openComments === item.id && (
                <div className="mt-2 ml-8 bg-white2 rounded-xl p-3">
                  {comments.length === 0 && <p className="text-xs text-muted italic">{t("comments_none")}</p>}
                  {comments.map((c) => (
                    <div key={c.id} className="text-xs mb-1.5">
                      {editingCommentId === c.id ? (
                        <div className="flex gap-1.5">
                          <input value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} className="flex-1 border border-border rounded-lg px-2 py-1 text-xs outline-none" />
                          <button onClick={() => saveEditComment(c.id)} className="text-ink font-medium">{t("save")}</button>
                          <button onClick={() => setEditingCommentId(null)} className="text-muted">{t("cancel")}</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-ink">{memberName(members.find(m=>m.id===c.author_id)?.id || "")}</span>
                          <span className="text-muted flex-1">{c.text}</span>
                          {c.author_id === me?.id && (
                            <>
                              <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.text); }} className="text-muted"><Pencil size={11} /></button>
                              <button onClick={() => deleteComment(c.id)} className="text-muted"><Trash2 size={11} /></button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
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
          ))}
        </div>

        </div>
      </>)}

      {view === "history" && (
        <div className="px-5">
        {hasBoughtItems ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">{showAllBought ? t("tasks_history") : t("courses_bought")}</div>
              <button onClick={() => { setShowAllBought(!showAllBought); setBoughtSearch(""); }} className="text-xs text-mustard font-medium">
                {showAllBought ? t("tasks_show_recent") : t("tasks_show_history")}
              </button>
            </div>
            {showAllBought && (
              <input
                value={boughtSearch}
                onChange={(e) => setBoughtSearch(e.target.value)}
                placeholder={t("courses_history_search")}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink mb-3"
              />
            )}
            <div className="space-y-4">
              {boughtGroups.map((group) => (
                <div key={group.label || "recent"}>
                  {group.label && <div className="text-[11px] font-semibold text-muted mb-1.5">{group.label}</div>}
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-3 border-b border-borderLight">
                        <div onClick={() => toggle(item)} className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-paper shrink-0 cursor-pointer"><Check size={12} strokeWidth={3} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-muted line-through">{item.name}{item.quantity && <span> · {item.quantity}</span>}</div>
                          <div className="text-[11px] text-muted">{item.bought_at && relativeDate(item.bought_at)}</div>
                        </div>
                        <button onClick={() => remove(item.id)} className="text-muted"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {showAllBought && bought.length === 0 && <div className="text-sm text-muted py-4">{t("courses_history_no_result")}</div>}
            </div>
          </>
        ) : (
          <EmptyState message={t("courses_history_no_result")} actionLabel={t("courses_add_first")} onAction={() => { setView("to_buy"); setEditingId(null); setShowAdd(true); }} />
        )}
        </div>
      )}

      {actionItemId && (() => {
        const actionItem = items.find((item) => item.id === actionItemId);
        if (!actionItem) return null;
        return (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35" onClick={() => setActionItemId(null)}>
            <div className="w-full max-w-xl rounded-t-[28px] bg-white2 px-5 pb-8 pt-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-border" />
              <div className="mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("courses_item_actions")}</div>
                <div className="mt-1 text-lg font-medium text-ink">{actionItem.name}</div>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => { setActionItemId(null); openItemComments(actionItem.id); }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-4 text-left text-ink"
                >
                  <MessageCircle size={18} />
                  <span>{t("courses_item_comments")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActionItemId(null); remove(actionItem.id); }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-4 text-left text-ink"
                >
                  <Trash2 size={18} />
                  <span>{t("courses_item_delete")}</span>
                </button>
              </div>
              <button type="button" onClick={() => setActionItemId(null)} className="mt-5 w-full py-2 text-sm text-muted">
                {t("cancel")}
              </button>
            </div>
          </div>
        );
      })()}

      {addConfirmation && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-30 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper shadow-lg">
          {t("courses_added_confirmation")}
        </div>
      )}

      {boughtConfirmation && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-30 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper shadow-lg" role="status" aria-live="polite">
          ✓ {t("courses_bought_confirmation")}
        </div>
      )}

      {view === "to_buy" && !showAdd && !headerAddButtonVisible && (
        <button
          type="button"
          onClick={() => { setEditingId(null); setShowAdd(true); }}
          className="md:hidden fixed right-5 bottom-24 z-20 rounded-full bg-ink px-4 py-3 text-sm font-medium text-paper shadow-lg"
        >
          <Plus size={15} className="inline mr-1" />{t("add")}
        </button>
      )}
    </div>
  );
}

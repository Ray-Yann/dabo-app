"use client";

import { CoursesSectionNav } from "@/components/CoursesSectionNav";
import { recognizeCourseStore, courseProductPhoto, courseProductSymbol, courseGenericArtwork } from "@/lib/courses-visual-catalog";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { EmptyState } from "@/components/EmptyState";
import { ShoppingItem, Comment } from "@/lib/types";
import { relativeDate, dueDateLabel, todayCivilDate } from "@/lib/utils";
import { notifyHousehold, notifyMembers } from "@/lib/notifications";
import { newlyAssignedMemberIds } from "@/lib/notification-assignment-targeting";
import { commentNotificationRecipientIds } from "@/lib/notification-comment-targeting";
import { Check, Plus, Trash2, MessageCircle, X, Pencil, Sparkles, MoreHorizontal, Store, ShoppingBasket, ShoppingCart, LayoutGrid, List as ListIcon, Search, ArrowRight, PackageCheck, Milk, Apple, Beef, SprayCan, CookingPot, Package, Scissors, Shirt, Wheat, Droplets, Layers, Waves } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/lib/language-context";
import { trackAcquisitionEvent } from "@/lib/acquisition";
import { completeFirstValueGuidance } from "@/lib/first-value-guidance";
import { generateShoppingSuggestions, type ShoppingSuggestionPreference } from "@/lib/dabo-shopping-engine";
import { NativeNameInput } from "@/components/NativeNameInput";
import { CourseNamePreviewInput } from "@/components/CourseNamePreviewInput";
import { DaboScanView } from "@/components/DaboScanView";
import { parseShoppingFinanceAmount, shoppingSessionPromptEligible, type ShoppingFinanceSession } from "@/lib/shopping-finance";
import { VERIFIED_STORE_SUPPLEMENTS } from "@/lib/world-store-catalog";
import { NearbyStoresPanel } from "@/components/NearbyStoresPanel";
import { recordContextualShareSuccess } from "@/lib/contextual-share";
import { ContextualShareNudge } from "@/components/ContextualShareNudge";
import { parseShoppingMemo, normalizeMemoName, type MemoArticle } from "@/lib/shopping-memo-v5";
import { readShoppingInboxPrefill } from "@/lib/household-inbox";
import {
  applyOfflineShoppingStatus,
  createShoppingOfflineSnapshot,
  mergePendingShoppingChanges,
  queueShoppingStatusChange,
  removeSyncedShoppingStatusChange,
} from "@/lib/shopping-offline";
import {
  loadShoppingOfflineQueue,
  loadShoppingOfflineSnapshot,
  saveShoppingOfflineQueue,
  saveShoppingOfflineSnapshot,
} from "@/lib/shopping-offline-storage";

type HouseholdStore = { id: string; name: string };
type ItemForm = { name: string; quantity: string; urgent: boolean; assignedTo: string; dueDate: string; store: string; customStore: string };
const EMPTY_FORM: ItemForm = { name: "", quantity: "", urgent: false, assignedTo: "", dueDate: "", store: "", customStore: "" };
const OTHER_STORE = "__other__";

const SHOPPING_CATEGORY_RULES = [
  /\b(lait|milk|melk|milch|leche|latte|leite|yaourt|yogurt|yoghurt|fromage|cheese|kaas|käse|queso|formaggio|queijo|beurre|butter|mantequilla)\b/i,
  /\b(pain|bread|brood|brot|pan|pane|pão|riz|rice|rijst|reis|arroz|riso|pâte|pasta|pâtes|noodle|farine|flour|meel|mehl|harina|farinha)\b/i,
  /\b(tomate|tomates|tomato|tomatoes|tomaat|tomaten|tomate[n]?|pomme|apple|appel|apfel|manzana|mela|maçã|banane|banana|banaan|bananen|carotte|carrot|wortel|zanahoria|cenoura|oignon|onion|ui|zwiebel|cebolla|cebola|salade|lettuce|sla|salat|lechuga|alface|orange|oranje|naranja|laranja)\b/i,
  /\b(oeuf|oeufs|œuf|œufs|egg|eggs|ei|eieren|eier|huevo|huevos|uovo|uova|ovo|ovos|viande|meat|vlees|fleisch|carne|poisson|fish|vis|fisch|pescado|pesce|peixe|poulet|chicken|kip|huhn|pollo|frango)\b/i,
  /\b(savon|soap|zeep|seife|jabón|sapone|sabão|lessive|detergent|wasmiddel|waschmittel|detergente|papier toilette|toilet paper|toiletpapier|toilettenpapier|papel higiénico|carta igienica|papel higiênico|shampo[o]?|dentifrice|toothpaste|tandpasta|zahnpasta|pasta de dientes)\b/i,
];

function storeMark(name: string): string {
  return recognizeCourseStore(name) || name.trim() || "•";
}

function coursePhoto(name: string): string | null {
  return courseProductPhoto(name);
}

/** Neutral fallback for products without an exact generic photograph. */
function CourseFallback({ name }: { name: string }) {
  const symbol = courseProductSymbol(name);
  const props = { size: 19, strokeWidth: 1.5, "aria-hidden": true as const };
  const icon = symbol === "scissors" ? <Scissors {...props} />
    : symbol === "hygiene" ? <Layers {...props} />
    : symbol === "cloth" ? <Waves {...props} />
    : symbol === "cleaning" ? <SprayCan {...props} />
    : symbol === "cotton" ? <Droplets {...props} />
    : symbol === "milk" ? <Milk {...props} />
    : symbol === "produce" ? <Apple {...props} />
    : symbol === "protein" ? <Beef {...props} />
    : symbol === "pantry" || symbol === "rice" ? <CookingPot {...props} />
    : <Package {...props} />;
  return <span className="dabo-courses-product-placeholder" aria-hidden="true">{icon}</span>;
}

/** Product artwork remains decorative; an unavailable asset gets an accessible-safe icon. */
function CourseProductVisual({ name }: { name: string }) {
  const photo = coursePhoto(name);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  if (!photo || photo === failedPath) {
    const artwork = courseGenericArtwork(name);
    return artwork ? <span className="dabo-courses-product-placeholder" role="img" aria-label={name} style={{ fontSize: 27, lineHeight: 1 }}>{artwork}</span> : <CourseFallback name={name} />;
  }
  return <img className="dabo-courses-product-photo" src={photo} alt="" loading="lazy" decoding="async" onError={() => setFailedPath(photo)} />;
}

function shoppingCategory(name: string, t: (key: string) => string): string {
  const keys = ["courses_v6_dairy", "courses_v6_pantry", "courses_v6_produce", "courses_v6_protein", "courses_v6_home"];
  const index = SHOPPING_CATEGORY_RULES.findIndex((pattern) => pattern.test(name.normalize("NFC")));
  return t(index >= 0 ? keys[index] : "courses_v6_other");
}


function ItemFormFields({
  form,
  setForm,
  members,
  t,
  stores,
}: {
  form: ItemForm;
  setForm: (f: ItemForm) => void;
  members: { id: string; first_name: string }[];
  t: (key: string) => string;
  stores: string[];
}) {

  return (
    <>
      <CourseNamePreviewInput
        value={form.name}
        placeholder={t("item_name_placeholder")}
        onCommit={(name) => setForm({ ...form, name })}
        className="min-w-0 flex-1 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-ink bg-white2 text-ink"
        renderPreview={(name) => <CourseProductVisual name={name} />}
      />
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
  const { loading, household, me, members, supabase, offlineFallback } = useHousehold();
  const t = useT();
  const [view, setView] = useState<"to_buy" | "suggestions" | "history">("to_buy");
  const [shoppingMode, setShoppingMode] = useState(false);
  const [shoppingSessionIds, setShoppingSessionIds] = useState<string[]>([]);
  const [shoppingSearch, setShoppingSearch] = useState("");
  const [shoppingGrouping, setShoppingGrouping] = useState<"store" | "category">("store");
  const [selectedShoppingCategory, setSelectedShoppingCategory] = useState<string | null>(null);

  useEffect(() => {
    const requestedView = new URL(window.location.href).searchParams.get("view");
    if (requestedView === "suggestions") {
      setView("suggestions");
    }
  }, []);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [householdStores, setHouseholdStores] = useState<HouseholdStore[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showScanV3, setShowScanV3] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("scan") !== "1") return;
    url.searchParams.delete("scan");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    if (navigator.onLine) setShowScanV3(true);
  }, []);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkImportBusy, setBulkImportBusy] = useState(false);
  const [memoPreview, setMemoPreview] = useState<MemoArticle[] | null>(null);
  const [bulkImportError, setBulkImportError] = useState("");
  const [addForm, setAddForm] = useState<ItemForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("first") !== "1") return;

    const inboxPrefill = readShoppingInboxPrefill(url.searchParams);

    url.searchParams.delete("first");

    if (inboxPrefill) {
      url.searchParams.delete("inbox");
      url.searchParams.delete("name");
      url.searchParams.delete("date");
    }

    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash
    );

    setView("to_buy");
    setEditingId(null);

    if (inboxPrefill) {
      setAddForm({
        ...EMPTY_FORM,
        name: inboxPrefill.name,
        dueDate: inboxPrefill.dueDate,
      });
    }

    setShowAdd(true);
  }, []);
  const [editForm, setEditForm] = useState<ItemForm>(EMPTY_FORM);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [boughtSearch, setBoughtSearch] = useState("");
  const deferredBoughtSearch = useDeferredValue(boughtSearch);
  const [showAllBought, setShowAllBought] = useState(false);
  const [addConfirmation, setAddConfirmation] = useState(false);
  const [firstValueConfirmation, setFirstValueConfirmation] = useState(false);
  const [boughtConfirmation, setBoughtConfirmation] = useState(false);
  const [suggestionPreferences, setSuggestionPreferences] = useState<ShoppingSuggestionPreference[]>([]);
  const [handledSuggestionKeys, setHandledSuggestionKeys] = useState<string[]>([]);
  const [suggestionsHandledThisVisit, setSuggestionsHandledThisVisit] = useState(0);
  const [suggestionBusy, setSuggestionBusy] = useState(false);
  const [suggestionMenuOpen, setSuggestionMenuOpen] = useState(false);
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const headerAddButtonRef = useRef<HTMLButtonElement | null>(null);
  const addChoiceDialogRef = useRef<HTMLDivElement | null>(null);
  const addChoiceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [headerAddButtonVisible, setHeaderAddButtonVisible] = useState(true);
  const [shoppingFinanceSession, setShoppingFinanceSession] = useState<ShoppingFinanceSession | null>(null);
  const [shoppingFinanceAmount, setShoppingFinanceAmount] = useState("");
  const [shoppingFinancePayer, setShoppingFinancePayer] = useState("");
  const [shoppingFinanceBusy, setShoppingFinanceBusy] = useState(false);
  const [shoppingFinanceError, setShoppingFinanceError] = useState("");
  const [shoppingFinanceSaved, setShoppingFinanceSaved] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [isSyncingOfflineChanges, setIsSyncingOfflineChanges] = useState(false);
  const [pendingOfflineChanges, setPendingOfflineChanges] = useState(0);
  const [hasOfflineSnapshot, setHasOfflineSnapshot] = useState(false);
  const [loadedShoppingHouseholdId, setLoadedShoppingHouseholdId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!showAddChoice) return;
    const dialog = addChoiceDialogRef.current;
    const trigger = document.activeElement instanceof HTMLButtonElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowAddChoice(false);
      } else if (event.key === "Tab" && dialog) {
        const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
        if (!buttons.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const restoreTarget = addChoiceTriggerRef.current ?? trigger;
      if (restoreTarget?.isConnected) restoreTarget.focus();
    };
  }, [showAddChoice]);

  const loadShoppingFinancePrompt = useCallback(async () => {
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
  }, [household, supabase, shoppingFinancePayer, me]);

  async function recordShoppingFinance() {
    if (!shoppingFinanceSession || !shoppingFinancePayer) return;
    const value = parseShoppingFinanceAmount(shoppingFinanceAmount);
    if (value === null) {
      setShoppingFinanceError(t("courses_finance_amount_error"));
      return;
    }
    setShoppingFinanceBusy(true);
    setShoppingFinanceError("");
    const { error } = await supabase.rpc("dabo_record_shopping_session_expense", {
      p_session_id: shoppingFinanceSession.id,
      p_amount: value,
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
    if (!shoppingFinanceSession || shoppingFinanceBusy) return;
    setShoppingFinanceBusy(true);
    const { error } = await supabase.from("shopping_sessions").update({ prompted_at: new Date().toISOString() }).eq("id", shoppingFinanceSession.id).eq("household_id", shoppingFinanceSession.household_id).eq("state", "pending").select("id").single();
    setShoppingFinanceBusy(false);
    if (error) { setShoppingFinanceError(t("courses_finance_save_error")); return; }
    setShoppingFinanceSession(null);
    setShoppingFinanceAmount("");
    setShoppingFinanceError("");
  }

  async function dismissShoppingFinance() {
    if (!shoppingFinanceSession || shoppingFinanceBusy) return;
    setShoppingFinanceBusy(true);
    const { error } = await supabase.from("shopping_sessions").update({ state: "dismissed", prompted_at: new Date().toISOString() }).eq("id", shoppingFinanceSession.id).eq("household_id", shoppingFinanceSession.household_id).eq("state", "pending").select("id").single();
    setShoppingFinanceBusy(false);
    if (error) { setShoppingFinanceError(t("courses_finance_save_error")); return; }
    setShoppingFinanceSession(null);
    setShoppingFinanceAmount("");
    setShoppingFinanceError("");
  }

  const loadItems = useCallback(async () => {
    if (!household) return;

    try {
      const [itemResult, preferenceResult, storeResult] = await Promise.all([
        supabase.from("shopping_items").select("*").eq("household_id", household.id).order("created_at", { ascending: false }),
        supabase.from("shopping_suggestion_preferences").select("*").eq("household_id", household.id),
        supabase.from("household_stores").select("id,name").eq("household_id", household.id).order("name"),
      ]);

      if (itemResult.error) {
        const snapshot = await loadShoppingOfflineSnapshot(household.id);
        if (snapshot) {
          const queue = await loadShoppingOfflineQueue(household.id);
          setLoadedShoppingHouseholdId(household.id);
          setHasOfflineSnapshot(true);
          setPendingOfflineChanges(queue.length);
          setItems(mergePendingShoppingChanges(snapshot.items, queue, household.id));
        }
        return;
      }

      const serverItems = (itemResult.data as ShoppingItem[]) || [];

      try {
        await saveShoppingOfflineSnapshot(
          createShoppingOfflineSnapshot(
            household.id,
            serverItems,
            new Date().toISOString()
          )
        );
      } catch (error) {
        console.error("Unable to save shopping offline snapshot", error);
      }

      const queue = await loadShoppingOfflineQueue(household.id);
      setLoadedShoppingHouseholdId(household.id);
      setHasOfflineSnapshot(true);
      setPendingOfflineChanges(queue.length);
      setItems(mergePendingShoppingChanges(serverItems, queue, household.id));

      if (!preferenceResult.error) {
        setSuggestionPreferences(
          (preferenceResult.data as ShoppingSuggestionPreference[]) || []
        );
      }

      if (!storeResult.error) {
        setHouseholdStores((storeResult.data as HouseholdStore[]) || []);
      }
    } catch (error) {
      console.error("Unable to load shopping items", error);

      const snapshot = await loadShoppingOfflineSnapshot(household.id);
      if (!snapshot) return;

      const queue = await loadShoppingOfflineQueue(household.id);
      setLoadedShoppingHouseholdId(household.id);
      setHasOfflineSnapshot(true);
      setPendingOfflineChanges(queue.length);
      setItems(mergePendingShoppingChanges(snapshot.items, queue, household.id));
    }
  }, [household, supabase]);

  const onScanV3Saved = useCallback(async () => {
    await loadItems();
    void loadShoppingFinancePrompt();
  }, [loadItems, loadShoppingFinancePrompt]);

  const syncPendingShoppingChanges = useCallback(async () => {
    if (!household || !navigator.onLine) return;

    const syncKey = `dabo-shopping-sync-${household.id}`;
    if (sessionStorage.getItem(syncKey) === "1") return;

    let queue = await loadShoppingOfflineQueue(household.id);
    setPendingOfflineChanges(queue.length);

    if (queue.length === 0) return;

    sessionStorage.setItem(syncKey, "1");
    setIsSyncingOfflineChanges(true);

    try {
      for (const change of [...queue]) {
        const { error } = await supabase.rpc("dabo_set_shopping_item_status", {
          p_item_id: change.itemId,
          p_status: change.status,
        });

        if (error) {
          console.error("Unable to synchronize offline shopping change", error);
          return;
        }

        queue = removeSyncedShoppingStatusChange(
          queue,
          household.id,
          change.itemId
        );

        await saveShoppingOfflineQueue(household.id, queue);
        setPendingOfflineChanges(queue.length);
      }

      await loadItems();
      void loadShoppingFinancePrompt();
    } catch (error) {
      console.error("Unable to synchronize offline shopping queue", error);
    } finally {
      setIsSyncingOfflineChanges(false);
      sessionStorage.removeItem(syncKey);
    }
  }, [household, supabase, loadItems, loadShoppingFinancePrompt]);

  useEffect(() => {
    if (!household) return;

    const timer = window.setTimeout(() => void loadItems(), 0);
    return () => window.clearTimeout(timer);
  }, [household, loadItems]);

  useEffect(() => {
    if (!household) return;

    const handleOnline = () => {
      setIsOnline(true);
      void syncPendingShoppingChanges();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const initialSyncTimer = navigator.onLine
      ? window.setTimeout(() => void syncPendingShoppingChanges(), 0)
      : null;

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (initialSyncTimer !== null) {
        window.clearTimeout(initialSyncTimer);
      }
    };
  }, [household, syncPendingShoppingChanges]);

  const offlineShoppingMode = !isOnline || offlineFallback;

  useEffect(() => {
    if (!household || offlineShoppingMode) return;

    const initialFinanceTimer = window.setTimeout(() => void loadShoppingFinancePrompt(), 0);
    const timer = window.setInterval(() => void loadShoppingFinancePrompt(), 60_000);

    return () => {
      window.clearTimeout(initialFinanceTimer);
      window.clearInterval(timer);
    };
  }, [household, me?.id, offlineShoppingMode, loadShoppingFinancePrompt]);

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
    const cleanName = name.trim();
    const alreadyKnown = householdStores.some((store) => store.name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase());
    if (alreadyKnown) return;
    // Un magasin saisi manuellement ou choisi à proximité reste personnel au foyer.
    // Il ne devient jamais automatiquement une recommandation nationale.
    const { data, error } = await supabase
      .from("household_stores")
      .insert({ household_id: household.id, name: cleanName })
      .select("id,name")
      .single();
    if (!error && data) {
      setHouseholdStores((current) => current.some((store) => store.id === data.id) ? current : [...current, data as HouseholdStore]);
    }
  }

  async function useNearbyStore(name: string) {
    const cleanName = name.trim();
    if (!cleanName) return;
    await rememberStore(cleanName);
    setEditingId(null);
    setShowAdd(true);
    setAddForm((current) => ({ ...current, store: cleanName, customStore: "" }));
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
    if (!shoppingInsertError) {
      void trackAcquisitionEvent("first_value", { householdId: household.id, valueType: "shopping" });
      if (completeFirstValueGuidance("shopping")) {
        setFirstValueConfirmation(true);
        window.setTimeout(() => setFirstValueConfirmation(false), 3200);
      }
    }
    if (!shoppingInsertError && me) {
      const targetMemberIds = newlyAssignedMemberIds(
        [],
        [addForm.assignedTo],
        me.id
      );
      void notifyMembers(
        supabase,
        household.id,
        me.id,
        targetMemberIds,
        "notif_item_assigned",
        { name: me.first_name, item: addForm.name.trim() }
      );
    }

    if (addForm.urgent && me) {
      notifyHousehold(supabase, household.id, me.id, "notif_item_urgent", { name: me.first_name, item: addForm.name.trim() });
    }
    setAddForm(EMPTY_FORM);
    setShowAdd(false);
    setAddConfirmation(true);
    window.setTimeout(() => setAddConfirmation(false), 2200);
    loadItems();
  }

  async function importShoppingList() {
    if (!household || bulkImportBusy) return;

    const articles = memoPreview;
    if (!articles || articles.length === 0 || articles.some((article) => !article.name.trim())) return;
    const names = articles.map((article) => article.name.trim());
    const existing = new Set(items.filter((item) => item.status !== "bought").map((item) => normalizeMemoName(item.name)));
    if (names.some((name) => existing.has(normalizeMemoName(name))) || new Set(names.map(normalizeMemoName)).size !== names.length) {
      setBulkImportError(t("courses_memo_duplicate_warning"));
      return;
    }

    setBulkImportBusy(true);
    setBulkImportError("");

    const { error } = await supabase.from("shopping_items").insert(
      articles.map((article) => ({
        household_id: household.id,
        name: article.name.trim(),
        quantity: article.quantity.trim() || null,
        urgent: false,
        assigned_to: null,
        due_date: null,
        store_name: null,
      }))
    );

    setBulkImportBusy(false);

    if (error) {
      console.error(error);
      setBulkImportError(t("courses_bulk_import_error"));
      return;
    }

    void trackAcquisitionEvent("first_value", {
      householdId: household.id,
      valueType: "shopping",
    });

    if (completeFirstValueGuidance("shopping")) {
      setFirstValueConfirmation(true);
      window.setTimeout(() => setFirstValueConfirmation(false), 3200);
    }

    setBulkImportText("");
    setMemoPreview(null);
    setShowBulkImport(false);
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
    const editedItem = items.find((i) => i.id === id);
    const wasUrgent = editedItem?.urgent || false;
    const storeName = resolvedStore(editForm);
    if (editForm.store === OTHER_STORE && !storeName) return;
    if (storeName) await rememberStore(storeName);
    const { error: shoppingUpdateError } = await supabase.from("shopping_items").update({
      name: editForm.name.trim(),
      quantity: editForm.quantity || null,
      urgent: editForm.urgent,
      assigned_to: editForm.assignedTo || null,
      due_date: editForm.dueDate || null,
      store_name: storeName || null,
    }).eq("id", id);
    if (shoppingUpdateError) {
      console.error(shoppingUpdateError);
      return;
    }

    if (household && me) {
      const targetMemberIds = newlyAssignedMemberIds(
        [editedItem?.assigned_to || null],
        [editForm.assignedTo],
        me.id
      );
      void notifyMembers(
        supabase,
        household.id,
        me.id,
        targetMemberIds,
        "notif_item_assigned",
        { name: me.first_name, item: editForm.name.trim() }
      );
    }

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

    if (!navigator.onLine && household) {
      try {
        const changedAt = new Date().toISOString();
        const currentSnapshot = await loadShoppingOfflineSnapshot(household.id);
        const currentQueue = await loadShoppingOfflineQueue(household.id);

        const updatedItems = applyOfflineShoppingStatus(
          items,
          item.id,
          status,
          changedAt
        );

        const updatedQueue = queueShoppingStatusChange(currentQueue, {
          itemId: item.id,
          householdId: household.id,
          status,
          changedAt,
        });

        await saveShoppingOfflineQueue(household.id, updatedQueue);
        setPendingOfflineChanges(updatedQueue.length);

        await saveShoppingOfflineSnapshot(
          createShoppingOfflineSnapshot(
            household.id,
            updatedItems,
            currentSnapshot?.syncedAt ?? ""
          )
        );

        setItems(updatedItems);

        if (status === "bought") {
          setBoughtConfirmation(true);
          window.setTimeout(() => setBoughtConfirmation(false), 2200);
        }
      } catch (error) {
        console.error("[DABO] offline shopping persistence failed", error);
      } finally {
        setAnimatingId(null);
      }

      return;
    }

    const { error } = await supabase.rpc("dabo_set_shopping_item_status", { p_item_id: item.id, p_status: status });
    setAnimatingId(null);
    if (error) return;
    if (status === "bought") {
      if (household && me?.user_id) {
        recordContextualShareSuccess(me.user_id, household.id);
      }
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
    if (!newComment.trim() || !openComments || !me || !household) return;

    const shoppingItemId = openComments;
    const commentedItem = items.find((item) => item.id === shoppingItemId);
    const previousCommentAuthorIds = comments
      .filter((comment) => comment.shopping_item_id === shoppingItemId)
      .map((comment) => comment.author_id);

    const { error: commentInsertError } = await supabase.from("comments").insert({
      household_id: household.id,
      author_id: me.id,
      shopping_item_id: shoppingItemId,
      text: newComment.trim(),
    });

    if (commentInsertError) {
      console.error(commentInsertError);
      return;
    }

    const targetMemberIds = commentNotificationRecipientIds({
      actorMemberId: me.id,
      assignedMemberIds: [commentedItem?.assigned_to],
      previousCommentAuthorIds,
    });

    if (targetMemberIds.length > 0 && commentedItem) {
      notifyMembers(
        supabase,
        household.id,
        me.id,
        targetMemberIds,
        "notif_item_comment",
        { name: me.first_name, item: commentedItem.name }
      );
    }

    setNewComment("");
    reloadComments(shoppingItemId);
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

  const shoppingDataMatchesHousehold = loadedShoppingHouseholdId === household?.id;
  const visibleItems = shoppingDataMatchesHousehold ? items : [];
  const toBuy = [...visibleItems.filter((i) => i.status === "to_buy")].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  const filteredToBuy = toBuy.filter((item) => (!selectedShoppingCategory || shoppingCategory(item.name, t) === t(selectedShoppingCategory)) && `${item.name} ${item.quantity || ""} ${item.store_name || ""}`.toLocaleLowerCase().includes(shoppingSearch.trim().toLocaleLowerCase()));
  const toBuyGroups = (() => {
    const groups = new Map<string, ShoppingItem[]>();
    for (const item of filteredToBuy) {
      const label = shoppingGrouping === "category" ? shoppingCategory(item.name, t) : (item.store_name?.trim() || t("courses_store_none_group"));
      groups.set(label, [...(groups.get(label) || []), item]);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (shoppingGrouping === "category") return a.localeCompare(b);
      if (a === t("courses_store_none_group")) return 1;
      if (b === t("courses_store_none_group")) return -1;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  })();
  const hasBoughtItems = visibleItems.some((i) => i.status === "bought");
  const purchasedCount = shoppingSessionIds.filter((id) => visibleItems.some((item) => item.id === id && item.status === "bought")).length;
  const shoppingTotal = shoppingMode ? shoppingSessionIds.length : toBuy.length;
  const shoppingProgress = shoppingMode && shoppingTotal ? Math.round((purchasedCount / shoppingTotal) * 100) : 0;
  const allBought = visibleItems
    .filter((i) => i.status === "bought")
    .filter((i) => i.name.toLowerCase().includes(deferredBoughtSearch.toLowerCase()))
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
    : generateShoppingSuggestions({ items: visibleItems, preferences: suggestionPreferences, today: todayCivilDate() })
        .filter((suggestion) => !handledSuggestionKeys.includes(suggestion.productKey));
  const shoppingSuggestion = shoppingSuggestions[0] ?? null;
  const hasCurrentOfflineSnapshot = shoppingDataMatchesHousehold && hasOfflineSnapshot;
  const effectiveView = offlineShoppingMode ? "to_buy" : view;

  function memberName(id: string | null) {
    return members.find((m) => m.id === id)?.first_name;
  }

  return (
    <div className="dabo-courses-v6 dabo-courses-v7 dabo-courses-v71 dabo-courses-v72">
      <div className="dabo-organic-header flex items-start justify-between px-5 pt-8 pb-4">
        <div className="relative z-[1]">
          <div className="dabo-brand-orbit" aria-hidden="true"><span className="dabo-brand-leaf dabo-brand-leaf-a" /><span className="dabo-brand-leaf dabo-brand-leaf-b" /><span className="dabo-brand-sun" /></div>
          <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{toBuy.length} {t("courses_remaining")}</div>
          <h1 className="font-serif text-3xl text-ink">{t("courses_title")}</h1>
          <p className="dabo-courses-subtitle">{t("courses_v6_intro")}</p>
        </div>
        {!offlineShoppingMode && (
          <div className="relative z-[1] flex flex-col items-end gap-2">
            <button
              ref={headerAddButtonRef}
              type="button"
              onClick={(event) => { addChoiceTriggerRef.current = event.currentTarget; setShowAddChoice(true); }}
              className="dabo-primary-action bg-ink text-paper px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5"
              aria-haspopup="dialog"
              aria-expanded={showAddChoice}
            >
              <Plus size={15} /> {t("add")}
            </button>
          </div>
        )}
      </div>

      {!offlineShoppingMode && <CoursesSectionNav />}

      {!offlineShoppingMode && (
        <section className="dabo-courses-overview mx-5 mb-5" aria-label={t("courses_v6_overview")}>
          <div className="dabo-courses-overview-copy">
            <div className="dabo-courses-overview-eyebrow"><ShoppingBasket size={15} /> {t("courses_v6_overview")}</div>
            <strong>{shoppingTotal} {t("courses_v6_articles")}</strong>
            {shoppingMode && <span>{`${purchasedCount} / ${shoppingTotal} · ${t("courses_bought")}`}</span>}
            {shoppingMode && <div className="dabo-courses-progress" role="progressbar" aria-valuenow={shoppingProgress} aria-valuemin={0} aria-valuemax={100} aria-label={t("courses_v6_progress")}><span style={{ width: `${shoppingProgress}%` }} /></div>}
          </div>
          <div className="dabo-courses-hero-photo" aria-hidden="true" />
          {shoppingMode && <span className="dabo-courses-progress-number">{shoppingProgress}%</span>}
        </section>
      )}

      {showAddChoice && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={() => setShowAddChoice(false)}
            aria-label={t("close")}
          />
          <div
            ref={addChoiceDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="courses-add-choice-title"
            className="relative z-[1] w-full max-w-lg rounded-t-[2rem] bg-white2 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="courses-add-choice-title" className="font-serif text-xl text-ink">
                  {t("courses_add_choice_title")}
                </h2>
                <p className="mt-1 text-sm text-muted">{t("courses_add_choice_help")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChoice(false)}
                className="shrink-0 rounded-full p-2 text-muted"
                aria-label={t("close")}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddChoice(false);
                  setEditingId(null);
                  setShowBulkImport(false);
                  setMemoPreview(null);
                  setBulkImportError("");
                  setShowAdd(true);
                }}
                className="flex w-full items-center gap-4 rounded-2xl border border-borderLight bg-paper/60 p-4 text-left transition hover:bg-paper"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                  <Plus size={20} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{t("courses_add_manual")}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t("courses_add_manual_help")}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddChoice(false);
                  setView("to_buy");
                  setEditingId(null);
                  setShowScanV3(false);
                  setShowAdd(true);
                  setShowBulkImport(true);
                  setBulkImportText("");
                  setMemoPreview(null);
                  setBulkImportError("");
                }}
                className="flex w-full items-center gap-4 rounded-2xl border border-borderLight bg-paper/60 p-4 text-left transition hover:bg-paper"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                  <Sparkles size={20} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{t("courses_bulk_import_title")}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t("courses_bulk_import_hint")}</span>
                </span>
              </button>

              {isOnline && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddChoice(false);
                    setShowScanV3(true);
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl border border-borderLight bg-paper/60 p-4 text-left transition hover:bg-paper"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                    <Sparkles size={20} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{t("courses_scan_receipt")}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t("courses_scan_receipt_help")}</span>
                  </span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAddChoice(false)}
              className="mt-3 w-full rounded-2xl px-4 py-3 text-sm font-medium text-muted"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      <IntroTip id="courses" title={t("intro_courses_title")} text={t("intro_courses")} />

      {!offlineShoppingMode && showScanV3 && household && me && (
        <div className="mx-5 mb-5 rounded-3xl border border-borderLight bg-white2 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-serif text-lg text-ink">{t("courses_scan_receipt_title")}</div>
              <div className="mt-1 text-xs text-muted">{t("courses_scan_receipt_help")}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowScanV3(false)}
              className="shrink-0 rounded-full p-2 text-muted"
              aria-label={t("close")}
            >
              <X size={18} />
            </button>
          </div>
          <DaboScanView
            household={household}
            me={me}
            members={members}
            supabase={supabase}
            onSaved={onScanV3Saved}
          />
        </div>
      )}

      {(offlineShoppingMode || isSyncingOfflineChanges || pendingOfflineChanges > 0) && (
        <div
          className="mx-5 mb-4 rounded-2xl border border-borderLight bg-white2 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <div className="text-sm font-semibold text-ink">
            {isSyncingOfflineChanges
              ? t("courses_offline_syncing")
              : offlineShoppingMode
                ? t("courses_offline_status")
                : t("courses_offline_pending").replace("{count}", String(pendingOfflineChanges))}
          </div>
          {offlineShoppingMode && hasOfflineSnapshot && pendingOfflineChanges > 0 && (
            <div className="mt-1 text-xs text-muted">
              {t("courses_offline_pending").replace("{count}", String(pendingOfflineChanges))}
            </div>
          )}
        </div>
      )}

      {offlineShoppingMode && !hasCurrentOfflineSnapshot && (
        <div className="mx-5 mb-5 rounded-3xl border border-borderLight bg-white2 p-5">
          <div className="font-serif text-lg text-ink">
            {t("courses_offline_unavailable_title")}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {t("courses_offline_unavailable_text")}
          </p>
        </div>
      )}

      {!offlineShoppingMode && shoppingFinanceSaved && (
        <div className="mx-5 mb-4 rounded-2xl border border-borderLight bg-white2 px-4 py-3 text-sm font-medium text-ink">
          {t("courses_finance_saved")}
        </div>
      )}

      {!offlineShoppingMode && shoppingFinanceSession && (
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
          {shoppingFinanceError && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{shoppingFinanceError}</p>}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
            <button disabled={shoppingFinanceBusy} onClick={recordShoppingFinance} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">{shoppingFinanceBusy ? t("scan_saving") : t("courses_finance_record")}</button>
            <button disabled={shoppingFinanceBusy} onClick={postponeShoppingFinance} className="rounded-xl border border-borderLight px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50">{t("courses_finance_later")}</button>
            <button disabled={shoppingFinanceBusy} onClick={dismissShoppingFinance} className="rounded-xl px-3 py-2.5 text-sm text-muted disabled:opacity-50">{t("courses_finance_skip")}</button>
          </div>
        </section>
      )}

      {!offlineShoppingMode && effectiveView === "suggestions" && shoppingSuggestion && (
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

      {!offlineShoppingMode && (
      <div className="px-5 mb-5">
        <div className="mb-2 text-sm font-medium text-muted" id="courses-view-label">{t("ux_view_label")}</div>
        <div role="group" aria-labelledby="courses-view-label" className="grid grid-cols-3 gap-1 rounded-2xl border border-borderLight bg-paper p-1">
          {([
            ["to_buy", "ux_courses_to_buy"],
            ["suggestions", "ux_courses_suggestions"],
            ["history", "ux_history"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={`min-w-0 rounded-xl px-2 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${view === key ? "bg-ink text-paper" : "text-ink hover:bg-white2"}`}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </div>
      )}

      {effectiveView === "to_buy" && !shoppingMode && (
        <section className="dabo-courses-category-rail mx-5 mb-5" aria-label={t("courses_v6_by_category")}>
          {selectedShoppingCategory && <button type="button" className="dabo-courses-clear-filter" onClick={() => setSelectedShoppingCategory(null)} aria-label={`${t("courses_v6_by_category")}: ${t("courses_v6_articles")}`}><X size={15} /> {t("courses_v6_articles")} · {toBuy.length}</button>}
          {(["courses_v6_produce", "courses_v6_dairy", "courses_v6_pantry", "courses_v6_protein", "courses_v6_home", "courses_v6_other"] as const).map((categoryKey) => {
            const count = toBuy.filter((item) => shoppingCategory(item.name, t) === t(categoryKey)).length;
            if (count === 0) return null;
            return (
              <button key={categoryKey} type="button" className="dabo-courses-category-card" aria-pressed={selectedShoppingCategory === categoryKey} onClick={() => { setSelectedShoppingCategory((current) => current === categoryKey ? null : categoryKey); setShoppingGrouping("category"); }} aria-label={`${t(categoryKey)} · ${count} ${t("courses_v6_articles")}`}>
                <span className={`dabo-courses-category-photo dabo-courses-category-photo-${categoryKey === "courses_v6_produce" ? "produce" : categoryKey === "courses_v6_dairy" ? "dairy" : categoryKey === "courses_v6_pantry" ? "pantry" : categoryKey === "courses_v6_protein" ? "protein" : categoryKey === "courses_v6_home" ? "home" : "other"}`} aria-hidden="true" />
                <span className="dabo-courses-category-label">{t(categoryKey)}<small>{count} {t("courses_v6_articles")}</small></span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            );
          })}
        </section>
      )}

      {effectiveView === "to_buy" && (
        <section className="dabo-courses-toolbar mx-5 mb-4" aria-label={t("courses_v6_tools")}>
          <label className="dabo-courses-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{t("courses_v6_search")}</span><input value={shoppingSearch} onChange={(event) => setShoppingSearch(event.target.value)} placeholder={t("courses_v6_search")} /></label>
          <div className="dabo-courses-toolbar-actions">
            <div className="dabo-courses-group-toggle" role="group" aria-label={t("courses_v6_group") }>
              <button type="button" onClick={() => setShoppingGrouping("store")} aria-pressed={shoppingGrouping === "store"} title={t("courses_v6_by_store")}><Store size={17} /><span>{t("courses_v6_by_store")}</span></button>
              <button type="button" onClick={() => setShoppingGrouping("category")} aria-pressed={shoppingGrouping === "category"} title={t("courses_v6_by_category")}><LayoutGrid size={17} /><span>{t("courses_v6_by_category")}</span></button>
            </div>
            <button type="button" className="dabo-courses-mode-button" onClick={() => { if (!shoppingMode) setShoppingSessionIds(toBuy.map((item) => item.id)); setShoppingMode((current) => !current); }} aria-pressed={shoppingMode}><ShoppingCart size={17} />{shoppingMode ? t("courses_v6_leave_mode") : t("courses_v6_shop_mode")}</button>
          </div>
        </section>
      )}
      {effectiveView === "to_buy" && shoppingMode && (
        <div className="dabo-courses-mode-progress mx-5 mb-4" role="status"><PackageCheck size={18} /> <span>{purchasedCount} / {shoppingTotal} · {shoppingProgress}%</span><div className="dabo-courses-progress"><span style={{ width: `${shoppingProgress}%` }} /></div></div>
      )}
      {effectiveView === "to_buy" && shoppingSearch.trim() && filteredToBuy.length === 0 && <p className="mx-5 mb-4 text-sm text-muted">{t("courses_v6_no_results")}</p>}

      {effectiveView === "to_buy" && !offlineShoppingMode && !shoppingMode && (
        <details className="dabo-courses-nearby mx-5 mb-4">
          <summary className="dabo-courses-nearby-trigger">{t("courses_nearby_title")}</summary>
          <NearbyStoresPanel supabase={supabase} t={t} onUseStore={useNearbyStore} />
        </details>
      )}

      {!offlineShoppingMode && effectiveView === "suggestions" && !shoppingSuggestion && (
        <div className="mx-5 rounded-3xl border border-borderLight bg-white2 p-6 text-center text-sm text-muted">{t("courses_empty")}</div>
      )}

      {effectiveView === "to_buy" && (<>
      {!offlineShoppingMode && showAdd && !shoppingMode && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold text-ink">{t("courses_add_question")}</div>
            <div className="text-xs text-muted mt-0.5">{t("courses_add_hint")}</div>
          </div>
          {!showBulkImport ? (
            <>
              <ItemFormFields form={addForm} setForm={setAddForm} members={members} t={t} stores={availableStores()} />
              <button
                type="button"
                onClick={() => {
                  setShowBulkImport(true);
                  setMemoPreview(null);
                  setBulkImportError("");
                }}
                className="text-xs font-medium text-muted underline underline-offset-2"
              >
                {t("courses_bulk_import_open")}
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <div>
                <div className="text-sm font-medium text-ink">{t("courses_bulk_import_title")}</div>
                <div className="mt-0.5 text-xs text-muted">{t("courses_bulk_import_hint")}</div>
              </div>
              <textarea
                autoFocus
                rows={6}
                value={bulkImportText}
                onChange={(event) => { setBulkImportText(event.target.value); setMemoPreview(null); setBulkImportError(""); }}
                placeholder={t("courses_bulk_import_placeholder")}
                className="w-full resize-y rounded-xl border border-border bg-white2 px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
              />
              {memoPreview && (
                <div className="space-y-2 rounded-xl border border-border bg-paper/50 p-3" aria-live="polite">
                  <p className="text-xs font-medium text-ink">{t("courses_memo_preview_title")}</p>
                  {memoPreview.map((article, index) => (
                    <div key={article.id} className="flex items-center gap-2">
                      <input aria-label={`${t("item_name_placeholder")} ${index + 1}`} value={article.name} onChange={(event) => setMemoPreview((current) => current?.map((entry) => entry.id === article.id ? { ...entry, name: event.target.value } : entry) ?? null)} className="min-w-0 flex-1 rounded-lg border border-border bg-white2 px-2 py-2 text-sm" />
                      <input aria-label={`${t("quantity_placeholder")} ${index + 1}`} value={article.quantity} onChange={(event) => setMemoPreview((current) => current?.map((entry) => entry.id === article.id ? { ...entry, quantity: event.target.value } : entry) ?? null)} className="w-24 rounded-lg border border-border bg-white2 px-2 py-2 text-sm" />
                      <button type="button" aria-label={t("delete")} onClick={() => setMemoPreview((current) => current?.filter((entry) => entry.id !== article.id) ?? null)} className="p-2 text-muted"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
              {bulkImportError && (
                <div className="text-xs text-red-600" role="alert">{bulkImportError}</div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={bulkImportBusy || (memoPreview ? memoPreview.length === 0 || memoPreview.some((article) => !article.name.trim()) : !bulkImportText.trim())}
                  onClick={() => { if (!memoPreview) { setMemoPreview(parseShoppingMemo(bulkImportText)); setBulkImportError(""); } else { void importShoppingList(); } }}
                  className="flex-1 rounded-xl bg-ink py-2 text-sm font-medium text-paper disabled:opacity-50"
                >
                  {bulkImportBusy ? t("loading") : memoPreview ? t("courses_bulk_import_add") : t("courses_memo_preview_action")}
                </button>
                <button
                  type="button"
                  disabled={bulkImportBusy}
                  onClick={() => {
                    setShowBulkImport(false);
                    setMemoPreview(null);
                    setBulkImportText("");
                    setBulkImportError("");
                  }}
                  className="px-4 text-sm text-muted disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          )}
          {!showBulkImport && (
          <div className="flex gap-2">
            <button onClick={addItem} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">{t("add")}</button>
            <button onClick={() => { setShowAdd(false); setShowBulkImport(false); setMemoPreview(null); setBulkImportError(""); setAddForm(EMPTY_FORM); }} className="px-4 text-sm text-muted">{t("cancel")}</button>
          </div>
          )}
        </div>
      )}

      <div className="px-5">
        {toBuy.length === 0 && !showAdd && !offlineShoppingMode && <EmptyState message={`${t("courses_empty_title")} ${t("courses_empty")}`} actionLabel={t("courses_add_first")} onAction={() => setShowAdd(true)} />}
        <div className="dabo-courses-list space-y-1 mb-6">
          {toBuyGroups.map(([storeLabel, storeItems]) => (
            <div key={storeLabel} className="dabo-courses-store-group mb-4">
              <div className="dabo-store-heading sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-paper/95 px-1 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted"><span className="dabo-store-heading-icon">{shoppingGrouping === "category" ? <LayoutGrid size={13} /> : <span className={`dabo-courses-store-monogram${recognizeCourseStore(storeLabel) ? " dabo-courses-store-recognized" : ""}`} data-store={recognizeCourseStore(storeLabel)?.toLowerCase().replace(/[^a-z]+/g, "-") || "custom"} aria-hidden="true">{recognizeCourseStore(storeLabel) ? <span className="dabo-courses-store-wordmark">{recognizeCourseStore(storeLabel)}</span> : storeMark(storeLabel).slice(0, 1).toLocaleUpperCase()}</span>}</span><span>{storeLabel}</span><span className="ml-auto font-normal normal-case">{storeItems.length}</span></div>
              {storeItems.map((item) => (
            <div key={item.id} className="dabo-courses-item border-b border-borderLight py-3">
              {editingId === item.id ? (
                <div className="bg-white2 rounded-xl p-3 space-y-2">
                  <ItemFormFields form={editForm} setForm={setEditForm} members={members} t={t} stores={availableStores()} />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(item.id)} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">{t("save")}</button>
                    <button onClick={() => setEditingId(null)} className="px-4 text-sm text-muted">{t("cancel")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggle(item)} aria-label={`${t("courses_bought")}: ${item.name}`} className={`dabo-courses-check w-6 h-6 rounded-full border-2 border-border shrink-0 cursor-pointer ${animatingId === item.id ? "bg-ink border-ink animate-check-pop" : ""}`} />
                  {<CourseProductVisual name={item.name} />}
                  <div className="flex-1 min-w-0" onClick={() => toggle(item)}>
                    <div className="text-sm text-ink cursor-pointer flex flex-wrap items-center gap-1.5">
                      <span>{item.name}</span>
                      {item.quantity && <span className="text-muted">· {item.quantity}</span>}
                      {item.urgent && <span className="rounded-full bg-mustardBg px-2 py-0.5 text-[10px] font-semibold text-mustard">{t("urgent_label")}</span>}
                      {item.store_name && shoppingGrouping !== "store" && <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium text-muted">{item.store_name}</span>}
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
                  {!offlineShoppingMode && !shoppingMode && (
                    <>
                      <button onClick={() => startEdit(item)} className="text-muted" aria-label={t("edit")}><Pencil size={16} /></button>
                      <button onClick={() => setActionItemId(item.id)} className="text-muted" aria-label={t("courses_item_more_actions")}><MoreHorizontal size={18} /></button>
                    </>
                  )}
                </div>
              )}
              {!offlineShoppingMode && !shoppingMode && openComments === item.id && (
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

      {offlineShoppingMode && hasCurrentOfflineSnapshot && allBought.length > 0 && (
        <section data-offline-bought-items="true" className="mx-5 mt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
            {t("courses_offline_bought")}
          </div>
          <div className="space-y-1">
            {allBought.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item)}
                aria-label={t("courses_restore_to_buy")}
                className="w-full flex items-center gap-3 py-3 border-b border-borderLight text-left"
              >
                <span className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-paper shrink-0">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-muted line-through">
                    {item.name}
                    {item.quantity && <span> · {item.quantity}</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!offlineShoppingMode && effectiveView === "history" && (
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
                        <div className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-paper shrink-0"><Check size={12} strokeWidth={3} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-muted line-through">{item.name}{item.quantity && <span> · {item.quantity}</span>}</div>
                          <div className="text-[11px] text-muted">{item.bought_at && relativeDate(item.bought_at)}</div>
                        </div>
                        <button onClick={() => setActionItemId(item.id)} className="text-muted" aria-label={t("courses_item_more_actions")}><MoreHorizontal size={18} /></button>
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

      {!offlineShoppingMode && actionItemId && (() => {
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
                {actionItem.status === "bought" && (
                  <button
                    type="button"
                    onClick={() => { setActionItemId(null); void toggle(actionItem); }}
                    className="flex w-full items-start gap-3 rounded-2xl border border-border px-4 py-4 text-left text-ink"
                  >
                    <Check size={18} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="block">{t("courses_history_restore")}</span>
                      <span className="mt-1 block text-xs font-normal text-muted">{t("courses_history_restore_help")}</span>
                    </span>
                  </button>
                )}
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

      {firstValueConfirmation && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 max-w-[calc(100%-2rem)] rounded-2xl bg-ink px-4 py-3 text-center text-xs font-medium text-paper shadow-lg"
          role="status"
          aria-live="polite"
        >
          ✓ {t("onboarding_first_value_confirmation")}
        </div>
      )}

      {addConfirmation && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-30 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper shadow-lg">
          {t("courses_added_confirmation")}
        </div>
      )}

      {!offlineShoppingMode && me?.user_id && household && (
        <ContextualShareNudge
          supabase={supabase}
          userId={me.user_id}
          householdId={household.id}
        />
      )}

      {boughtConfirmation && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-30 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper shadow-lg" role="status" aria-live="polite">
          ✓ {t("courses_bought_confirmation")}
        </div>
      )}

    </div>
  );
}

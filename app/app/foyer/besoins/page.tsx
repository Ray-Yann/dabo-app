"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, Clock3 } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { useT } from "@/lib/language-context";

type Need = {
  id: string;
  household_id: string;
  title: string;
  status: string;
  resolution_mode: string;
  created_at: string;
  resolved_at: string | null;
};

type NeedAction = {
  id: string;
  need_id: string;
  resource_type: string;
  resource_id: string | null;
  role: string;
  position: number;
  human_confirmed_at: string | null;
};

type OperationalResource = {
  id: string;
  household_id: string;
  name?: string;
  title?: string;
  label?: string;
  status?: string;
  completed_at?: string | null;
  bought_at?: string | null;
  paid_transaction_id?: string | null;
  event_date?: string | null;
  due_date?: string | null;
  due_on?: string | null;
  occurred_on?: string | null;
};

type ResourceMap = Record<string, OperationalResource>;
const statusKeys: Record<string, string> = {
  open: "household_needs_status_open",
  in_progress: "household_needs_status_in_progress",
  awaiting_confirmation: "household_needs_status_awaiting_confirmation",
  resolved: "household_needs_status_resolved",
  cancelled: "household_needs_status_cancelled",
};

const resourceKeys: Record<string, string> = {
  task: "household_needs_resource_task",
  shopping_item: "household_needs_resource_shopping",
  calendar_event: "household_needs_resource_calendar",
  finance_bill: "household_needs_resource_bill",
  finance_transaction: "household_needs_resource_transaction",
  human_confirmation: "household_needs_resource_human",
};

export default function HouseholdNeedsPage() {
  const router = useRouter();
  const t = useT();
  const { loading, household, supabase } = useHousehold();
  const householdId = household?.id;

  const [snapshot, setSnapshot] = useState<{
    householdId: string;
    needs: Need[];
    actions: NeedAction[];
    resources: ResourceMap;
  } | null>(null);
  const requestSequence = useRef(0);
  const activeHouseholdId = useRef<string | undefined>(householdId);
  activeHouseholdId.current = householdId;
  const [busy, setBusy] = useState(false);
  const [confirmingNeedId, setConfirmingNeedId] = useState<string | null>(null);
  const confirmationLock = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    const sequence = ++requestSequence.current;
    setBusy(true);
    setError(null);

    try {
      const { data: needRows, error: needError } = await supabase
        .from("household_needs")
        .select("id,household_id,title,status,resolution_mode,created_at,resolved_at")
        .eq("household_id", id)
        .order("created_at", { ascending: false });

      if (needError) throw needError;

      const { data: actionRows, error: actionError } = await supabase
        .from("household_need_actions")
        .select("id,need_id,resource_type,resource_id,role,position,human_confirmed_at")
        .eq("household_id", id)
        .order("position", { ascending: true });

      if (actionError) throw actionError;

      const resourceTypes = [
        "task",
        "shopping_item",
        "calendar_event",
        "finance_bill",
        "finance_transaction",
      ] as const;

      const nextResources: ResourceMap = {};

      await Promise.all(resourceTypes.map(async (resourceType) => {
        const ids = [...new Set(
          (actionRows ?? [])
            .filter((action) =>
              action.resource_type === resourceType && action.resource_id
            )
            .map((action) => action.resource_id as string)
        )];

        if (ids.length === 0) return;

        const { data, error: resourceError } =
          resourceType === "task"
            ? await supabase.from("tasks")
                .select("id,household_id,name,status,completed_at,due_date")
                .eq("household_id", id).in("id", ids)
            : resourceType === "shopping_item"
              ? await supabase.from("shopping_items")
                  .select("id,household_id,name,status,bought_at,due_date")
                  .eq("household_id", id).in("id", ids)
              : resourceType === "calendar_event"
                ? await supabase.from("calendar_events")
                    .select("id,household_id,title,event_date")
                    .eq("household_id", id).in("id", ids)
                : resourceType === "finance_bill"
                  ? await supabase.from("finance_bills")
                      .select("id,household_id,label,status,paid_transaction_id,due_on")
                      .eq("household_id", id)
                      .eq("visibility", "household")
                      .in("id", ids)
                  : await supabase.from("finance_transactions")
                      .select("id,household_id,label,status,occurred_on")
                      .eq("household_id", id)
                      .eq("visibility", "household")
                      .in("id", ids);

        if (resourceError) throw resourceError;

        for (const row of data ?? []) {
          const resource = row as OperationalResource;
          nextResources[`${resourceType}:${resource.id}`] = resource;
        }
      }));

      if (sequence !== requestSequence.current || activeHouseholdId.current !== id) return;
      setSnapshot({
        householdId: id,
        needs: (needRows ?? []) as Need[],
        actions: (actionRows ?? []) as NeedAction[],
        resources: nextResources,
      });
    } catch {
      if (sequence === requestSequence.current && activeHouseholdId.current === id) {
        setSnapshot(null);
        setError("household_needs_load_error");
      }
    } finally {
      if (sequence === requestSequence.current && activeHouseholdId.current === id) {
        setBusy(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    setBusy(false);
    setError(null);

    return () => {
      requestSequence.current += 1;
    };
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    void load(householdId);
  }, [householdId, load]);


  const confirmNeed = async (needId: string) => {
    if (!householdId || confirmationLock.current || busy) return;

    const currentHouseholdId = householdId;
    const eligible = snapshot?.householdId === currentHouseholdId
      && snapshot.needs.some(
        (need) => need.id === needId && need.status === "awaiting_confirmation"
      );

    if (!eligible) return;

    confirmationLock.current = true;
    setConfirmingNeedId(needId);
    setError(null);

    try {
      const { error: confirmationError } = await supabase.rpc(
        "closed_loop_confirm_need",
        { p_need_id: needId }
      );

      if (confirmationError) throw confirmationError;

      if (activeHouseholdId.current === currentHouseholdId) {
        await load(currentHouseholdId);
      }
    } catch {
      if (activeHouseholdId.current === currentHouseholdId) {
        setError("household_needs_confirm_error");
      }
    } finally {
      confirmationLock.current = false;
      setConfirmingNeedId(null);
    }
  };
  if (loading || !household) return <LoadingState />;

  const visibleSnapshot =
    snapshot?.householdId === household.id ? snapshot : null;
  const visibleNeeds = visibleSnapshot?.needs ?? [];
  const visibleActions = visibleSnapshot?.actions ?? [];
  const resources = visibleSnapshot?.resources ?? {};

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-6 sm:px-6">
      <button
        type="button"
        onClick={() => router.push("/app/foyer")}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft size={17} />
        {t("household_needs_back")}
      </button>

      <header className="mb-7">
        <p className="dabo-kicker">{t("household_needs_eyebrow")}</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">
          {t("household_needs_title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {t("household_needs_intro")}
        </p>
      </header>

      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {visibleNeeds.length} {t(visibleNeeds.length === 1 ? "household_needs_count_one" : "household_needs_count_many")}
        </p>
        <button
          type="button"
          onClick={() => void load(household.id)}
          disabled={busy}
          className="rounded-full border border-borderLight px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          {t("household_needs_refresh")}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-5 rounded-2xl border border-borderLight p-4 text-sm text-ink">
          {t(error)}
        </p>
      )}

      {busy && visibleNeeds.length === 0 && <LoadingState />}

      {!busy && !error && visibleNeeds.length === 0 && (
        <section className="rounded-[1.75rem] border border-borderLight bg-white2/70 p-8 text-center">
          <ClipboardList size={30} className="mx-auto mb-4 text-muted" />
          <h2 className="font-serif text-xl font-semibold text-ink">
            {t("household_needs_empty")}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {t("household_needs_empty_hint")}
          </p>
        </section>
      )}

      <div className="space-y-4">
        {visibleNeeds.map((need) => {
          const linked = visibleActions.filter((action) => action.need_id === need.id);

          return (
            <article
              key={need.id}
              className="rounded-[1.75rem] border border-borderLight bg-white2/70 p-5 shadow-[0_18px_45px_rgba(42,51,37,0.04)] sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-xl font-semibold text-ink">
                    {need.title}
                  </h2>
                  <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted">
                    <CalendarDays size={14} />
                    {new Date(need.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full border border-borderLight px-3 py-1 text-xs font-semibold text-ink">
                  {t(statusKeys[need.status] ?? need.status)}
                </span>
              </div>

              {linked.length > 0 && (
                <div className="mt-5 space-y-2 border-t border-borderLight pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-ink">
                    {t("household_needs_actions")}
                  </h3>
                  {linked.map((action) => {
                    const resource = action.resource_id
                      ? resources[`${action.resource_type}:${action.resource_id}`]
                      : undefined;

                    const completed =
                      action.resource_type === "human_confirmation"
                        ? Boolean(action.human_confirmed_at)
                        : action.resource_type === "task"
                          ? resource?.status === "done" && Boolean(resource.completed_at)
                          : action.resource_type === "shopping_item"
                            ? resource?.status === "bought" && Boolean(resource.bought_at)
                            : action.resource_type === "finance_bill"
                              ? resource?.status === "paid" && Boolean(resource.paid_transaction_id)
                              : action.resource_type === "finance_transaction"
                                ? resource?.status === "posted"
                                : false;

                    const date = resource?.event_date
                      ?? resource?.due_date
                      ?? resource?.due_on
                      ?? resource?.occurred_on;

                    const name = resource?.name
                      ?? resource?.title
                      ?? resource?.label
                      ?? (resourceKeys[action.resource_type] ? t(resourceKeys[action.resource_type]) : undefined)
                      ?? t("household_needs_resource_generic");

                    return (
                      <div key={action.id} className="flex items-start gap-3 text-sm">
                        {completed ? (
                          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ink" />
                        ) : (
                          <Clock3 size={18} className="mt-0.5 shrink-0 text-muted" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-ink">{name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {t(resourceKeys[action.resource_type] ?? action.resource_type)}
                            {action.role === "required" ? ` · ${t("household_needs_required")}` : ""}
                            {action.role === "progress" ? ` · ${t("household_needs_planning")}` : ""}
                            {" · "}
                            {action.resource_type === "calendar_event"
                              ? t("household_needs_planned_only")
                              : completed
                                ? t("household_needs_done")
                                : t("household_needs_pending")}
                          </p>
                          {date && (
                            <p className="mt-1 text-xs text-muted">
                              {t("household_needs_date")} : {date}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {need.status === "awaiting_confirmation" && (
                <button
                  type="button"
                  disabled={busy || confirmingNeedId !== null}
                  onClick={() => void confirmNeed(need.id)}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={17} />
                  {confirmingNeedId === need.id
                    ? t("household_needs_confirming")
                    : t("household_needs_confirm")}
                </button>
              )}
              {need.status === "awaiting_confirmation" && (
                <p className="mt-4 rounded-2xl border border-borderLight p-3 text-sm text-ink">
                  {t("household_needs_awaiting_message")}
                </p>
              )}

              {need.status === "resolved" && need.resolved_at && (
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
                  <CheckCircle2 size={16} />
                  {t("household_needs_resolved_on")} {new Date(need.resolved_at).toLocaleDateString()}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
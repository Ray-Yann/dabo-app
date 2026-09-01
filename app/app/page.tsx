"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { Task, ShoppingItem } from "@/lib/types";
import { ShoppingBag, Info, Plus, ListChecks } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { InstallPrompt } from "@/components/InstallPrompt";
import { InviteNudge } from "@/components/InviteNudge";
import { useT } from "@/lib/language-context";
import { useRouter } from "next/navigation";

export default function TodayPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasksForBalance, setAllTasksForBalance] = useState<Task[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [totalItemsEver, setTotalItemsEver] = useState<number | null>(null);
  const [showEquityInfo, setShowEquityInfo] = useState(false);

  useEffect(() => {
    if (!household || !me) return;
    (async () => {
      const { data: myTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("household_id", household.id)
        .eq("status", "pending")
        .or(`assigned_to.eq.${me.id},assigned_to.is.null`);
      setTasks((myTasks as Task[]) || []);

      const { data: allTasks } = await supabase.from("tasks").select("*").eq("household_id", household.id);
      setAllTasksForBalance((allTasks as Task[]) || []);
      setShowEquityInfo(((allTasks as Task[]) || []).filter((t) => t.status === "done").length < 2);

      const { data: myItems } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("household_id", household.id)
        .eq("status", "to_buy")
        .or(`assigned_to.eq.${me.id},assigned_to.is.null`);
      setItems((myItems as ShoppingItem[]) || []);

      const { count } = await supabase
        .from("shopping_items")
        .select("*", { count: "exact", head: true })
        .eq("household_id", household.id);
      setTotalItemsEver(count ?? 0);
    })();
  }, [household, me]);

  async function toggleTask(id: string) {
    await supabase.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }
  async function toggleItem(id: string) {
    await supabase.from("shopping_items").update({ status: "bought", bought_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (loading || !household || !me) return <LoadingState />;

  const nothingToDo = tasks.length === 0 && items.length === 0;
  const isBrandNew = nothingToDo && allTasksForBalance.length === 0 && totalItemsEver === 0;
  const sortedItems = [...items].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  const sortedTasks = [...tasks].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));

  return (
    <div>
      <Header eyebrow={household.name} title={`${t("hello")}, ${me.first_name}`} />
      <IntroTip id="today" text={t("intro_today")} />
      <InstallPrompt />
      {household && (
        <InviteNudge
          householdId={household.id}
          memberCount={members.length}
          householdType={household.household_type}
          text={t("invite_nudge_text")}
        />
      )}

      {household.equity_score_enabled && (
        <div className="mx-5 mb-5 bg-white2 rounded-2xl p-4">
          <div className="text-xs text-muted mb-3 font-medium">{t("equity_week_label")}</div>
          <BalanceBar members={members} tasks={allTasksForBalance} />
          {showEquityInfo && (
            <div className="mt-3 flex gap-2 text-[11px] text-muted bg-mustardBg rounded-lg p-2.5">
              <Info size={13} className="shrink-0 mt-0.5 text-mustard" />
              <span>{t("equity_intro")}</span>
            </div>
          )}
        </div>
      )}

      <div className="px-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{t("today_todo")}</div>
        {nothingToDo && (
          isBrandNew ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted mb-4">{t("today_empty_new")}</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => router.push("/app/courses")} className="flex items-center gap-1.5 bg-ink text-paper rounded-xl px-4 py-2.5 text-sm font-medium">
                  <Plus size={15} /> {t("courses_title")}
                </button>
                <button onClick={() => router.push("/app/taches")} className="flex items-center gap-1.5 bg-ink text-paper rounded-xl px-4 py-2.5 text-sm font-medium">
                  <Plus size={15} /> {t("tasks_title")}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted italic py-2">{t("today_empty")}</p>
          )
        )}

        {sortedItems.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] text-muted mb-1 flex items-center gap-1.5"><ShoppingBag size={11} /> {t("courses_title")} · {sortedItems.length}</div>
            <div className="space-y-1">
              {sortedItems.map((i) => (
                <div key={i.id} className="flex items-center gap-3 py-3 border-b border-borderLight cursor-pointer" onClick={() => toggleItem(i.id)}>
                  <div className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center text-muted shrink-0">
                    <ShoppingBag size={11} />
                  </div>
                  <span className="text-sm text-ink flex items-center gap-1.5 flex-1">
                    {i.urgent && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title={t("urgent_label")} />}
                    {i.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sortedTasks.length > 0 && (
          <div>
            <div className="text-[11px] text-muted mb-1 flex items-center gap-1.5"><ListChecks size={11} /> {t("tasks_title")} · {sortedTasks.length}</div>
            <div className="space-y-1">
              {sortedTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3 border-b border-borderLight cursor-pointer" onClick={() => toggleTask(task.id)}>
                  <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />
                  <span className="text-sm text-ink flex-1 flex items-center gap-1.5">
                    {task.urgent && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title={t("urgent_label")} />}
                    {task.name}
                  </span>
                  <span className="text-[11px] text-mustard bg-mustardBg rounded-full px-2 py-0.5 font-mono">{task.weight_points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

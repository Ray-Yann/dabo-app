"use client";

import { useEffect, useState } from "react";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { Task, ShoppingItem } from "@/lib/types";
import { ShoppingBag, Info } from "lucide-react";

export default function TodayPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasksForBalance, setAllTasksForBalance] = useState<Task[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [showEquityInfo, setShowEquityInfo] = useState(false);

  useEffect(() => {
    if (!household || !me) return;
    (async () => {
      const { data: myTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("household_id", household.id)
        .eq("assigned_to", me.id)
        .eq("status", "pending");
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

  if (loading || !household || !me) return <div className="p-8 text-center text-muted">Chargement…</div>;

  const nothingToDo = tasks.length === 0 && items.length === 0;

  return (
    <div>
      <Header eyebrow={household.name} title={`Bonjour, ${me.first_name}`} />

      {household.equity_score_enabled && (
        <div className="mx-5 mb-5 bg-white2 rounded-2xl p-4">
          <div className="text-xs text-muted mb-3 font-medium">Équilibre cette semaine</div>
          <BalanceBar members={members} tasks={allTasksForBalance} />
          {showEquityInfo && (
            <div className="mt-3 flex gap-2 text-[11px] text-muted bg-mustardBg rounded-lg p-2.5">
              <Info size={13} className="shrink-0 mt-0.5 text-mustard" />
              <span>Chaque tâche a un poids selon le temps qu&apos;elle prend. Le total montre qui porte quoi cette semaine — pas un classement.</span>
            </div>
          )}
        </div>
      )}

      <div className="px-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">À faire</div>
        {nothingToDo && <p className="text-sm text-muted italic py-2">Tout est à jour pour l&apos;instant.</p>}
        <div className="space-y-1">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 py-3 border-b border-borderLight cursor-pointer" onClick={() => toggleItem(i.id)}>
              <div className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center text-muted shrink-0">
                <ShoppingBag size={11} />
              </div>
              <span className="text-sm text-ink">{i.name}</span>
            </div>
          ))}
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-3 border-b border-borderLight cursor-pointer" onClick={() => toggleTask(t.id)}>
              <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />
              <span className="text-sm text-ink flex-1">{t.name}</span>
              <span className="text-[11px] text-mustard bg-mustardBg rounded-full px-2 py-0.5 font-mono">{t.weight_points} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

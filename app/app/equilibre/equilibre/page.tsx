"use client";

import { useEffect, useState } from "react";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { IntroTip } from "@/components/IntroTip";
import { Task } from "@/lib/types";

export default function BalancePage() {
  const { loading, household, members, supabase } = useHousehold();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!household) return;
    (async () => {
      const { data } = await supabase.from("tasks").select("*").eq("household_id", household.id);
      setTasks((data as Task[]) || []);
    })();
  }, [household]);

  if (loading || !household) return <div className="p-8 text-center text-muted">Chargement…</div>;

  return (
    <div>
      <Header eyebrow="Cette semaine" title="Équilibre" />
      <IntroTip id="balance" text="Chaque tâche pèse selon le temps qu'elle prend. Ce total montre qui porte quoi cette semaine — pas un classement." />
      <div className="mx-5 mb-5 bg-white2 rounded-2xl p-5">
        {household.equity_score_enabled ? (
          <BalanceBar members={members} tasks={tasks} big />
        ) : (
          <p className="text-sm text-muted italic text-center py-4">Le score d&apos;équité est désactivé pour ce foyer.</p>
        )}
      </div>
      <p className="text-center text-xs text-muted italic mt-6">Le score est un repère, pas un classement.</p>
    </div>
  );
}

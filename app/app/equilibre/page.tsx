"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { IntroTip } from "@/components/IntroTip";
import { Task } from "@/lib/types";
import { useT } from "@/lib/language-context";

export default function BalancePage() {
  const { loading, household, members, supabase } = useHousehold();
  const [tasks, setTasks] = useState<Task[]>([]);
  const t = useT();

  useEffect(() => {
    if (!household) return;
    (async () => {
      const { data } = await supabase.from("tasks").select("*").eq("household_id", household.id);
      setTasks((data as Task[]) || []);
    })();
  }, [household]);

  if (loading || !household) return <LoadingState />;

  return (
    <div>
      <Header eyebrow={t("balance_this_week")} title={t("balance_title")} />
      <IntroTip id="balance" text={t("intro_balance")} />
      <div className="mx-5 mb-5 bg-white2 rounded-2xl p-5">
        {household.equity_score_enabled ? (
          <BalanceBar members={members} tasks={tasks} big />
        ) : (
          <p className="text-sm text-muted italic text-center py-4">{t("balance_disabled")}</p>
        )}
      </div>
      <p className="text-center text-xs text-muted italic mt-6">{t("balance_footnote")}</p>
    </div>
  );
}

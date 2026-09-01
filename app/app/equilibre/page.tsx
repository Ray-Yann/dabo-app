"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { IntroTip } from "@/components/IntroTip";
import { Task } from "@/lib/types";
import { useT } from "@/lib/language-context";
import { computeMemberPoints } from "@/lib/utils";
import { Share2 } from "lucide-react";

type Period = "week" | "month" | "quarter";

function startOfPeriod(period: Period): Date {
  const d = new Date();
  if (period === "week") {
    const day = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
  } else if (period === "month") {
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
  } else {
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 90);
  }
  return d;
}

export default function BalancePage() {
  const { loading, household, members, supabase } = useHousehold();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [period, setPeriod] = useState<Period>("week");
  const t = useT();

  useEffect(() => {
    if (!household) return;
    (async () => {
      const { data } = await supabase.from("tasks").select("*").eq("household_id", household.id);
      setTasks((data as Task[]) || []);
    })();
  }, [household]);

  if (loading || !household) return <LoadingState />;

  const since = startOfPeriod(period);
  const totals = computeMemberPoints(members, tasks, since);
  const total = totals.reduce((s, m) => s + m.pts, 0);
  const sorted = [...totals].sort((a, b) => a.pts - b.pts);
  const lowest = sorted[0];
  const average = total / (members.length || 1);
  // Suggestion douce et privée, jamais publique ni accusatrice : seulement si
  // un écart net existe, avec au moins un peu d'activité pour que ce soit
  // pertinent (pas de suggestion sur un foyer qui vient de démarrer).
  const showSuggestion =
    members.length > 1 &&
    total >= 40 &&
    average > 0 &&
    lowest.pts < average * 0.6;

  function shareReport() {
    const periodLabel = period === "week" ? t("balance_this_week") : period === "month" ? t("balance_this_month") : t("balance_last_3_months");
    const lines = totals.map((m) => `${m.first_name} : ${m.pts} pts`).join("\n");
    const text = `${household!.name} — ${periodLabel}\n${lines}`;
    if (navigator.share) {
      navigator.share({ title: "Dabo", text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert(t("share_app_copied"));
    }
  }

  return (
    <div>
      <Header eyebrow={t("balance_this_week")} title={t("balance_title")} />
      <IntroTip id="balance" text={t("intro_balance")} />

      <div className="flex gap-2 px-5 mb-4">
        {(["week", "month", "quarter"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-xs border ${period === p ? "bg-ink text-paper border-ink" : "border-border text-muted"}`}
          >
            {p === "week" ? t("balance_this_week") : p === "month" ? t("balance_this_month") : t("balance_last_3_months")}
          </button>
        ))}
      </div>

      <div className="mx-5 mb-5 bg-white2 rounded-2xl p-5">
        {household.equity_score_enabled ? (
          <BalanceBar members={members} tasks={tasks} big since={since} />
        ) : (
          <p className="text-sm text-muted italic text-center py-4">{t("balance_disabled")}</p>
        )}
      </div>

      {household.equity_score_enabled && showSuggestion && (
        <div className="mx-5 mb-5 bg-mustardBg rounded-2xl p-4 text-sm text-ink">
          {t("rebalance_suggestion").replace("{name}", lowest.first_name)}
        </div>
      )}

      {household.equity_score_enabled && (
        <button onClick={shareReport} className="mx-5 mb-5 flex items-center justify-center gap-2 w-full border border-border rounded-xl py-2.5 text-sm text-muted">
          <Share2 size={14} /> {t("share_report")}
        </button>
      )}

      <p className="text-center text-xs text-muted italic mt-2">{t("balance_footnote")}</p>
    </div>
  );
}

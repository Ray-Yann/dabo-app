"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { IntroTip } from "@/components/IntroTip";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Task, DURATION_OPTIONS, EFFORT_OPTIONS } from "@/lib/types";
import { useT } from "@/lib/language-context";
import { computeMemberPoints, computeMemberPercentages } from "@/lib/utils";
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

function durationLabel(key: string | null): string {
  return DURATION_OPTIONS.find((d) => d.key === key)?.label || "—";
}
function effortLabel(key: string | null): string {
  return EFFORT_OPTIONS.find((e) => e.key === key)?.label || "—";
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
  const percentages = computeMemberPercentages(totals.map((m) => ({ id: m.id, pts: m.pts })));
  const sorted = [...totals].sort((a, b) => a.pts - b.pts);
  const lowest = sorted[0];
  const average = total / (members.length || 1);
  // Suggestion douce et privée, jamais publique ni accusatrice, sans jamais
  // citer de pourcentage — ton neutre et bienveillant uniquement.
  const showSuggestion =
    members.length > 1 &&
    total >= 40 &&
    average > 0 &&
    lowest.pts < average * 0.6;

  // Tâches prises en compte dans le calcul de la période, pour le détail.
  const sinceMs = since.getTime();
  const detailTasks = tasks
    .filter((tk) => tk.status === "done" && tk.completed_at && new Date(tk.completed_at).getTime() >= sinceMs)
    .filter((tk) => members.some((m) => m.id === tk.assigned_to));

  function shareReport() {
    const periodLabel = period === "week" ? t("balance_this_week") : period === "month" ? t("balance_this_month") : t("balance_last_3_months");
    const lines = totals.map((m) => `${m.first_name} : ${percentages.get(m.id) ?? 0}%`).join("\n");
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
        {!household.equity_score_enabled ? (
          <p className="text-sm text-muted italic text-center py-4">{t("balance_disabled")}</p>
        ) : total === 0 ? (
          <p className="text-sm text-muted italic text-center py-4">{t("balance_empty_period")}</p>
        ) : (
          <BalanceBar members={members} tasks={tasks} big since={since} />
        )}
      </div>

      {household.equity_score_enabled && showSuggestion && (
        <div className="mx-5 mb-5 bg-mustardBg rounded-2xl p-4 text-sm text-ink">
          {t("rebalance_suggestion").replace("{name}", lowest.first_name)}
        </div>
      )}

      {household.equity_score_enabled && total > 0 && (
        <>
          <button onClick={shareReport} className="mx-5 mb-3 flex items-center justify-center gap-2 w-full border border-border rounded-xl py-2.5 text-sm text-muted">
            <Share2 size={14} /> {t("share_report")}
          </button>

          <div className="px-5 mb-5">
            <CollapsibleSection title={t("view_contribution_detail")} defaultOpen={false}>
              <div className="bg-white2 rounded-2xl p-4">
                <div className="space-y-2 mb-3">
                  {detailTasks.map((tk) => (
                    <div key={tk.id} className="flex items-center justify-between text-xs border-b border-borderLight pb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-ink">{tk.name}</div>
                        <div className="text-muted">{durationLabel(tk.duration_key)} · {effortLabel(tk.effort_level)}</div>
                      </div>
                      <span className="font-mono text-mustard shrink-0 ml-2">{tk.weight_points} pts</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm font-medium text-ink pt-1">
                  <span>{t("detail_total")}</span>
                  <span className="font-mono">{total} pts</span>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </>
      )}

      <p className="text-center text-xs text-muted italic mt-2">{t("balance_footnote")}</p>
    </div>
  );
}

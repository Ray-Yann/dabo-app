"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { IntroTip } from "@/components/IntroTip";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Task, DURATION_OPTIONS, EFFORT_OPTIONS } from "@/lib/types";
import { useT } from "@/lib/language-context";
import { computeMemberPercentages } from "@/lib/utils";
import {
  ContributionBalanceData,
  computeContributionMemberPoints,
  countConfirmedContributionsSince,
  fetchContributionBalanceData,
} from "@/lib/task-contributions";
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

function durationLabel(key: string | null): string | null {
  return DURATION_OPTIONS.find((d) => d.key === key)?.label || null;
}
function effortLabel(key: string | null): string | null {
  return EFFORT_OPTIONS.find((e) => e.key === key)?.label || null;
}

export default function BalancePage() {
  const { loading, household, members, supabase } = useHousehold();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [balanceData, setBalanceData] = useState<ContributionBalanceData>({ contributions: [], participants: [] });
  const [period, setPeriod] = useState<Period>("week");
  const [showAllDetails, setShowAllDetails] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!household) return;
    (async () => {
      const [{ data }, contributionData] = await Promise.all([
        supabase.from("tasks").select("*").eq("household_id", household.id),
        fetchContributionBalanceData(supabase, household.id),
      ]);
      setTasks((data as Task[]) || []);
      setBalanceData(contributionData);
    })().catch((error) => console.error("DABO balance load failed", error));
  }, [household, supabase]);

  const since = useMemo(() => startOfPeriod(period), [period]);

  if (loading || !household) return <LoadingState />;

  const pointsByMember = computeContributionMemberPoints(
    members.map((member) => member.id),
    balanceData.contributions,
    balanceData.participants,
    since
  );
  const totals = members.map((member) => ({
    id: member.id,
    first_name: member.first_name,
    pts: pointsByMember.get(member.id) || 0,
  }));
  const confirmedContributionCount = countConfirmedContributionsSince(
    balanceData.contributions,
    balanceData.participants,
    since
  );
  const percentages = computeMemberPercentages(totals.map((member) => ({ id: member.id, pts: member.pts })));
  const sinceMs = since.getTime();
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const participantsByContribution = new Map<string, string[]>();
  balanceData.participants.forEach((participant) => {
    const names = participantsByContribution.get(participant.contribution_id) || [];
    const member = members.find((candidate) => candidate.id === participant.member_id);
    if (member) names.push(member.first_name);
    participantsByContribution.set(participant.contribution_id, names);
  });
  const detailContributions = balanceData.contributions
    .filter(
      (contribution) =>
        !contribution.cancelled_at &&
        new Date(contribution.completed_at).getTime() >= sinceMs
    )
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  const visibleDetailContributions = showAllDetails ? detailContributions : detailContributions.slice(0, 5);
  const hasHistoricalUnknowns = detailContributions.some((contribution) => contribution.performer_status === "unknown");

  function shareReport() {
    const periodLabel = period === "week" ? t("balance_this_week") : period === "month" ? t("balance_this_month") : t("balance_last_3_months");
    const lines = totals.map((member) => `${member.first_name} : ${percentages.get(member.id) ?? 0}%`).join("\n");
    const text = `${household!.name} — ${periodLabel}\n${lines}\n${t("balance_footnote")}`;
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
      <IntroTip id="balance" title={t("intro_balance_title")} text={t("intro_balance")} />

      <div className="flex gap-2 px-5 mb-4">
        {(["week", "month", "quarter"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setShowAllDetails(false); }}
            className={`flex-1 py-2 rounded-xl text-xs border ${period === p ? "bg-ink text-paper border-ink" : "border-border text-muted"}`}
          >
            {p === "week" ? t("balance_this_week") : p === "month" ? t("balance_this_month") : t("balance_last_3_months")}
          </button>
        ))}
      </div>

      <div className="mx-5 mb-5 bg-white2 rounded-2xl p-5">
        {!household.equity_score_enabled ? (
          <p className="text-sm text-muted italic text-center py-4">{t("balance_disabled")}</p>
        ) : detailContributions.length === 0 ? (
          <p className="text-sm text-muted italic text-center py-4">{t("balance_empty_period")}</p>
        ) : confirmedContributionCount < 4 ? (
          <div className="text-center py-3">
            <p className="text-base text-ink font-medium">{t("balance_building_title")}</p>
            <p className="text-sm text-muted mt-1">
              {t("balance_building_text").replace("{count}", String(confirmedContributionCount))}
            </p>
            {hasHistoricalUnknowns && (
              <p className="text-xs text-muted mt-3">{t("balance_historical_unknown_note")}</p>
            )}
          </div>
        ) : (
          <BalanceBar
            members={members}
            contributions={balanceData.contributions}
            participants={balanceData.participants}
            big
            since={since}
          />
        )}
      </div>

      {household.equity_score_enabled && detailContributions.length > 0 && (
        <>
          {confirmedContributionCount >= 4 && (
            <button onClick={shareReport} className="mx-5 mb-3 flex items-center justify-center gap-2 w-full border border-border rounded-xl py-2.5 text-sm text-muted">
              <Share2 size={14} /> {t("share_report")}
            </button>
          )}

          <div className="px-5 mb-5">
            <CollapsibleSection title={t("view_contribution_detail")} defaultOpen>
              <div className="bg-white2 rounded-2xl p-4">
                <div className="space-y-2">
                  {visibleDetailContributions.map((contribution) => {
                    const task = taskById.get(contribution.task_id);
                    const duration = durationLabel(contribution.duration_key);
                    const effort = effortLabel(contribution.effort_level);
                    const meta = [duration, effort ? `${t("effort_label")} ${effort.toLowerCase()}` : null]
                      .filter(Boolean)
                      .join(" · ");
                    const performers = participantsByContribution.get(contribution.id) || [];
                    return (
                      <div key={contribution.id} className="flex items-start justify-between gap-3 text-xs border-b border-borderLight pb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-ink">{task?.name || t("tasks_title")}</div>
                          <div className="text-muted">{meta || t("effort_not_provided")}</div>
                        </div>
                        <span className="text-muted shrink-0 text-right">
                          {contribution.performer_status === "unknown" || performers.length === 0
                            ? t("balance_performer_unknown")
                            : performers.join(" & ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {detailContributions.length > 5 && (
                  <div className="pt-3 text-center">
                    <p className="text-[11px] text-muted mb-2">
                      {t("balance_detail_count")
                        .replace("{shown}", String(visibleDetailContributions.length))
                        .replace("{total}", String(detailContributions.length))}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAllDetails((value) => !value)}
                      className="text-xs text-mustard hover:underline"
                    >
                      {showAllDetails ? t("balance_show_less") : t("balance_show_all_detail")}
                    </button>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>
        </>
      )}

      <p className="text-center text-xs text-muted italic mt-2">{t("balance_footnote")}</p>
    </div>
  );
}

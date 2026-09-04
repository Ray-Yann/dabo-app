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
  const memberShares = totals.map((member) => percentages.get(member.id) ?? 0);
  const highestShare = memberShares.length ? Math.max(...memberShares) : 0;
  const idealShare = members.length > 0 ? 100 / members.length : 100;
  const balanceLevel: "healthy" | "gentle" | "marked" =
    members.length === 2
      ? highestShare < 60
        ? "healthy"
        : highestShare < 70
          ? "gentle"
          : "marked"
      : highestShare <= idealShare * 1.2
        ? "healthy"
        : highestShare <= idealShare * 1.5
          ? "gentle"
          : "marked";
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

  const groupedDetailContributions = (() => {
    const groups = new Map<string, typeof visibleDetailContributions>();
    visibleDetailContributions.forEach((contribution) => {
      const date = new Date(contribution.completed_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const current = groups.get(key) || [];
      current.push(contribution);
      groups.set(key, current);
    });
    return Array.from(groups.entries()).map(([key, contributions]) => ({
      key,
      date: new Date(contributions[0].completed_at),
      contributions,
    }));
  })();

  function formatDayLabel(date: Date) {
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = Math.round((startToday.getTime() - startDate.getTime()) / 86400000);
    if (diff === 0) return t("balance_today");
    if (diff === 1) return t("balance_yesterday");
    const label = new Intl.DateTimeFormat(t("balance_date_locale"), {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

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
      <Header
        eyebrow={period === "week" ? t("balance_this_week") : period === "month" ? t("balance_this_month") : t("balance_last_3_months")}
        title={t("balance_title")}
      />
      <IntroTip id="balance" title={t("intro_balance_title")} text={t("intro_balance")} />

      <div className="mx-5 mb-4 rounded-2xl bg-white2 p-1.5 flex gap-1">
        {(["week", "month", "quarter"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setShowAllDetails(false); }}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs transition-colors ${period === p ? "bg-paper text-ink shadow-sm font-medium" : "text-muted hover:text-ink"}`}
          >
            {p === "week" ? t("balance_this_week") : p === "month" ? t("balance_this_month") : t("balance_last_3_months")}
          </button>
        ))}
      </div>

      <div className="mx-5 mb-5 bg-white2/70 rounded-2xl p-5 border border-borderLight/70">
        {!household.equity_score_enabled ? (
          <p className="text-sm text-muted italic text-center py-4">{t("balance_disabled")}</p>
        ) : detailContributions.length === 0 ? (
          <p className="text-sm text-muted italic text-center py-4">{t("balance_empty_period")}</p>
        ) : confirmedContributionCount < 4 ? (
          <div>
            <div className="text-center mb-4">
              <p className="text-base text-ink font-medium">{t("balance_building_title")}</p>
              <p className="text-sm text-muted mt-1">{t("balance_building_text")}</p>
              <p className="text-[11px] text-muted mt-2">
                {(confirmedContributionCount === 1 ? t("balance_partial_data_one") : t("balance_partial_data")).replace("{count}", String(confirmedContributionCount))}
              </p>
            </div>
            <BalanceBar
              members={members}
              contributions={balanceData.contributions}
              participants={balanceData.participants}
              big
              since={since}
            />
          </div>
        ) : (
          <div>
            <div className="text-center mb-5">
              <p className="text-base text-ink font-medium">
                {balanceLevel === "healthy"
                  ? t("balance_healthy_title")
                  : balanceLevel === "gentle"
                    ? t("balance_gentle_title")
                    : t("balance_marked_title")}
              </p>
              <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
                {balanceLevel === "healthy"
                  ? t("balance_healthy_text")
                  : balanceLevel === "gentle"
                    ? t("balance_gentle_text")
                    : t("balance_marked_text")}
              </p>
            </div>
            <BalanceBar
              members={members}
              contributions={balanceData.contributions}
              participants={balanceData.participants}
              big
              since={since}
            />
          </div>
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
                <div className="space-y-5">
                  {groupedDetailContributions.map((group) => (
                    <div key={group.key}>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted whitespace-nowrap">
                          {formatDayLabel(group.date)}
                        </p>
                        <div className="h-px flex-1 bg-borderLight" />
                      </div>
                      <div className="space-y-0">
                        {group.contributions.map((contribution, index) => {
                          const task = taskById.get(contribution.task_id);
                          const duration = durationLabel(contribution.duration_key);
                          const effort = effortLabel(contribution.effort_level);
                          const meta = [duration, effort ? `${t("effort_label")} ${effort.toLowerCase()}` : null]
                            .filter(Boolean)
                            .join(" · ");
                          const performers = participantsByContribution.get(contribution.id) || [];
                          const isUnknown = contribution.performer_status === "unknown" || performers.length === 0;
                          return (
                            <div
                              key={contribution.id}
                              className={`flex items-start justify-between gap-3 py-2.5 text-xs ${index < group.contributions.length - 1 ? "border-b border-borderLight" : ""}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-ink font-medium">{task?.name || t("tasks_title")}</div>
                                <div className="text-muted mt-0.5">{meta || t("effort_not_provided")}</div>
                              </div>
                              <div className={`shrink-0 text-right max-w-[42%] ${isUnknown ? "text-muted/70" : "text-muted"}`}>
                                <div className="text-[10px] mb-0.5">{t("balance_done_by")}</div>
                                <div className="leading-4">
                                  {isUnknown ? t("balance_performer_unknown") : performers.join(" & ")}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
            {hasHistoricalUnknowns && (
              <p className="text-[11px] text-muted mt-3 px-1">{t("balance_historical_unknown_note")}</p>
            )}
          </div>
        </>
      )}

      <p className="text-center text-xs text-muted italic mt-2">{t("balance_footnote")}</p>
    </div>
  );
}

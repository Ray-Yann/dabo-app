"use client";

import { Member } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { startOfWeek, computeMemberPercentages, memberColor } from "@/lib/utils";
import { useT } from "@/lib/language-context";
import {
  TaskContribution,
  TaskContributionParticipant,
  computeContributionMemberPoints,
} from "@/lib/task-contributions";

export function BalanceBar({
  members,
  contributions,
  participants,
  big = false,
  since,
}: {
  members: Member[];
  contributions: TaskContribution[];
  participants: TaskContributionParticipant[];
  big?: boolean;
  since?: Date;
}) {
  const t = useT();
  const periodStart = since || startOfWeek();
  const points = computeContributionMemberPoints(
    members.map((member) => member.id),
    contributions,
    participants,
    periodStart
  );
  const totals = members.map((member) => ({
    ...member,
    color: memberColor(members, member.id),
    pts: points.get(member.id) || 0,
  }));
  const total = totals.reduce((sum, member) => sum + member.pts, 0) || 1;
  const percentages = computeMemberPercentages(totals.map((member) => ({ id: member.id, pts: member.pts })));

  return (
    <div>
      <div className="relative">
        <div className={`flex w-full rounded-full overflow-hidden bg-borderLight ${big ? "h-4" : "h-2.5"}`}>
          {totals.map((member) => (
            <div
              key={member.id}
              className="transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${(member.pts / total) * 100}%`, background: member.color }}
            />
          ))}
        </div>
        {big && totals.length === 2 && (
          <div
            className="absolute left-1/2 top-[-4px] h-6 w-px -translate-x-1/2 bg-ink/30"
            aria-hidden="true"
          />
        )}
      </div>

      {big && totals.length === 2 && (
        <div className="mt-1 text-center text-[10px] text-muted">{t("balance_reference_50_50")}</div>
      )}

      {big && (
        <div className="flex justify-between flex-wrap gap-3 mt-3">
          {totals.map((member) => (
            <div key={member.id} className="flex items-center gap-2 min-w-0">
              <Avatar member={member} members={members} size={28} />
              <div className="min-w-0">
                <div className="text-xs text-ink truncate">{member.first_name}</div>
                <div className="text-sm font-medium text-ink">{percentages.get(member.id) ?? 0}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

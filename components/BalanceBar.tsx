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
  selectedMemberId,
  onMemberSelect,
}: {
  members: Member[];
  contributions: TaskContribution[];
  participants: TaskContributionParticipant[];
  big?: boolean;
  since?: Date;
  selectedMemberId?: string | null;
  onMemberSelect?: (memberId: string) => void;
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
            className="absolute left-1/2 top-[-5px] h-7 w-px -translate-x-1/2 bg-ink/40 dark:bg-white/40"
            aria-hidden="true"
          />
        )}
      </div>

      {big && (
        <div className="flex justify-between flex-wrap gap-3 mt-3">
          {totals.map((member) => {
            const selected = selectedMemberId === member.id;
            const interactive = Boolean(onMemberSelect);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onMemberSelect?.(member.id)}
                aria-pressed={interactive ? selected : undefined}
                className={`flex items-center gap-2 min-w-0 rounded-xl px-2 py-1.5 -mx-2 transition-colors ${
                  interactive ? "cursor-pointer hover:bg-paper/60" : "cursor-default"
                } ${selected ? "bg-paper ring-1 ring-border" : ""}`}
              >
                <Avatar member={member} members={members} size={28} />
                <div className="min-w-0 text-left">
                  <div className="text-xs text-ink truncate">{member.first_name}</div>
                  {member.left_at && (
                    <div className="text-[10px] leading-4 text-muted">{t("balance_former_member")}</div>
                  )}
                  <div className="text-sm font-medium text-ink">{percentages.get(member.id) ?? 0}%</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

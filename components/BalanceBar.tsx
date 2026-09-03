"use client";

import { Member } from "@/lib/types";
import { startOfWeek, computeMemberPercentages, memberColor } from "@/lib/utils";
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
      <div className={`flex w-full rounded-full overflow-hidden bg-borderLight ${big ? "h-4" : "h-2.5"}`}>
        {totals.map((member) => (
          <div
            key={member.id}
            style={{ width: `${(member.pts / total) * 100}%`, background: member.color }}
          />
        ))}
      </div>
      <div
        className="mx-auto mt-1"
        style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid #22301F" }}
      />
      {big && (
        <div className="flex justify-between flex-wrap gap-2 mt-3">
          {totals.map((member) => (
            <div key={member.id} className="flex flex-col items-center gap-0.5 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ background: member.color }} />
              <span className="text-ink">{member.first_name}</span>
              <span className="font-mono text-muted text-[11px]">{percentages.get(member.id) ?? 0}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

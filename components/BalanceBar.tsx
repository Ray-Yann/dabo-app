"use client";

import { Member, Task } from "@/lib/types";
import { startOfWeek, MEMBER_COLORS } from "@/lib/utils";

export function BalanceBar({ members, tasks, big = false }: { members: Member[]; tasks: Task[]; big?: boolean }) {
  const weekStart = startOfWeek().getTime();
  const totals = members.map((m, i) => ({
    ...m,
    color: MEMBER_COLORS[i % MEMBER_COLORS.length],
    pts: tasks
      .filter((t) => t.status === "done" && t.assigned_to === m.id && t.completed_at && new Date(t.completed_at).getTime() >= weekStart)
      .reduce((s, t) => s + t.weight_points, 0),
  }));
  const total = totals.reduce((s, m) => s + m.pts, 0) || 1;

  return (
    <div>
      <div className={`flex w-full rounded-full overflow-hidden bg-borderLight ${big ? "h-4" : "h-2.5"}`}>
        {totals.map((m) => (
          <div key={m.id} style={{ width: `${(m.pts / total) * 100}%`, background: m.color }} />
        ))}
      </div>
      <div
        className="mx-auto mt-1"
        style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid #22301F" }}
      />
      {big && (
        <div className="flex justify-between flex-wrap gap-2 mt-3">
          {totals.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-0.5 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
              <span className="text-ink">{m.first_name}</span>
              <span className="font-mono text-muted text-[11px]">{m.pts} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

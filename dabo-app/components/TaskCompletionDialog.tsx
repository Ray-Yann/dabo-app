"use client";

import { Task, Member } from "@/lib/types";

type Props = {
  task: Task;
  me: Member;
  members: Member[];
  t: (key: string) => string;
  onChoose: (performerIds: string[]) => void;
  onCancel: () => void;
};

export function TaskCompletionDialog({ task, me, members, t, onChoose, onCancel }: Props) {
  const assigned = members.find((member) => member.id === task.assigned_to);
  if (!assigned || assigned.id === me.id) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-paper rounded-3xl p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="text-[11px] uppercase tracking-wide text-muted font-semibold mb-2">{t("task_done_by_label")}</div>
        <h2 className="font-serif text-xl text-ink mb-1">{t("task_done_by_title")}</h2>
        <p className="text-sm text-muted mb-4">
          {t("task_done_by_text").replace("{task}", task.name).replace("{member}", assigned.first_name)}
        </p>
        <div className="space-y-2">
          <button type="button" onClick={() => onChoose([me.id])} className="w-full text-left border border-border rounded-xl px-4 py-3 text-sm text-ink hover:bg-white2">
            {t("task_done_by_me")}
          </button>
          <button type="button" onClick={() => onChoose([assigned.id])} className="w-full text-left border border-border rounded-xl px-4 py-3 text-sm text-ink hover:bg-white2">
            {t("task_done_by_assigned").replace("{member}", assigned.first_name)}
          </button>
          <button type="button" onClick={() => onChoose([me.id, assigned.id])} className="w-full text-left border border-border rounded-xl px-4 py-3 text-sm text-ink hover:bg-white2">
            {t("task_done_by_together").replace("{member}", assigned.first_name)}
          </button>
        </div>
        <button type="button" onClick={onCancel} className="w-full mt-3 py-2 text-sm text-muted">{t("cancel")}</button>
      </div>
    </div>
  );
}

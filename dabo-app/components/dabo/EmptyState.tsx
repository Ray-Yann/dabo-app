"use client";

import type { LucideIcon } from "lucide-react";
import { Plus, Sprout } from "lucide-react";

export function EmptyState({ title = "Tout est tranquille", message, actionLabel, onAction, icon: Icon = Sprout }: {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}) {
  return (
    <div className="dabo-empty-state relative overflow-hidden flex flex-col items-center rounded-2xl border border-borderLight bg-white2 px-6 py-8 text-center">
      <span className="dabo-empty-state-leaf" aria-hidden="true" />
      <div className="dabo-empty-state-icon relative z-[1] mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-mustardBg text-mustard"><Icon size={20} aria-hidden="true" /></div>
      <div className="relative z-[1] font-serif text-lg font-semibold text-ink">{title}</div>
      {message && <p className="relative z-[1] mt-1 max-w-sm text-xs leading-relaxed text-muted">{message}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="dabo-primary-action relative z-[1] mt-4 inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
          <Plus size={15} aria-hidden="true" />{actionLabel}
        </button>
      )}
    </div>
  );
}

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
    <div className="dabo-empty-state flex flex-col items-center rounded-2xl border border-borderLight bg-white2 px-6 py-8 text-center">
      <div className="dabo-empty-state-icon mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-mustardBg text-mustard"><Icon size={20} aria-hidden="true" /></div>
      <div className="font-serif text-lg font-semibold text-ink">{title}</div>
      {message && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{message}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
          <Plus size={15} aria-hidden="true" />{actionLabel}
        </button>
      )}
    </div>
  );
}

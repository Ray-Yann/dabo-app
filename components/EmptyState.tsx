"use client";

import { Plus } from "lucide-react";

export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <p className="text-sm text-muted mb-4">{message}</p>
      <button
        onClick={onAction}
        className="flex items-center gap-2 bg-ink text-paper rounded-xl px-5 py-3 text-sm font-medium"
      >
        <Plus size={16} /> {actionLabel}
      </button>
    </div>
  );
}

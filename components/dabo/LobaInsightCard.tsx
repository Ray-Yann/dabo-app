"use client";

import { ArrowRight, Sparkles } from "lucide-react";

export function LobaInsightCard({ text, actionLabel, onAction, eyebrow = "LOBA" }: { text: string; actionLabel?: string; onAction?: () => void; eyebrow?: string }) {
  return (
    <div className="rounded-2xl border border-mustard/25 bg-mustardBg p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white2 text-mustard"><Sparkles size={18} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mustard">{eyebrow}</div>
          <p className="mt-1 text-sm leading-relaxed text-ink">{text}</p>
          {actionLabel && onAction && (
            <button type="button" onClick={onAction} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
              {actionLabel}<ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

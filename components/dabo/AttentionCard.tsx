"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, BellRing, CircleAlert, Info, Sparkles } from "lucide-react";
import type { AttentionLevel } from "@/lib/attention-engine";

const LEVEL_UI: Record<AttentionLevel, { label: string; icon: LucideIcon; accent: string; surface: string }> = {
  action_now: { label: "À faire maintenant", icon: CircleAlert, accent: "text-rose-700 dabo-dark:text-rose-300", surface: "bg-rose-50/80 border-rose-200/80 dabo-dark:bg-rose-950/20 dabo-dark:border-rose-900/50" },
  anticipate: { label: "À anticiper", icon: BellRing, accent: "text-amber-700 dabo-dark:text-amber-300", surface: "bg-amber-50/80 border-amber-200/80 dabo-dark:bg-amber-950/20 dabo-dark:border-amber-900/50" },
  suggestion: { label: "Suggestion", icon: Sparkles, accent: "text-sky-700 dabo-dark:text-sky-300", surface: "bg-sky-50/70 border-sky-200/80 dabo-dark:bg-sky-950/20 dabo-dark:border-sky-900/50" },
  information: { label: "Information", icon: Info, accent: "text-muted", surface: "bg-white2 border-borderLight" },
};

export function AttentionCard({ level, levelLabel, title, description, meta, actionLabel, onAction, icon: CustomIcon }: {
  level: AttentionLevel;
  levelLabel?: string;
  title: string;
  description?: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}) {
  const ui = LEVEL_UI[level];
  const Icon = CustomIcon ?? ui.icon;
  const content = (
    <>
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white2/80 ${ui.accent}`}>
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${ui.accent}`}>{levelLabel ?? ui.label}</div>
        <div className="text-sm font-semibold leading-snug text-ink">{title}</div>
        {description && <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>}
        {meta && <p className="mt-2 text-[11px] font-medium text-muted">{meta}</p>}
        {actionLabel && <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink">{actionLabel}<ArrowRight size={14} aria-hidden="true" /></div>}
      </div>
    </>
  );

  const classes = `w-full rounded-2xl border p-4 text-left shadow-[0_1px_0_rgba(34,48,31,0.03)] transition ${ui.surface} ${onAction ? "cursor-pointer active:scale-[0.995]" : ""}`;
  return onAction ? <button type="button" onClick={onAction} className={classes}>{<div className="flex items-start gap-3">{content}</div>}</button> : <article className={classes}><div className="flex items-start gap-3">{content}</div></article>;
}

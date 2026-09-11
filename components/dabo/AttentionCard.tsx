"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, BellRing, CircleAlert, Info, Sparkles } from "lucide-react";
import type { AttentionLevel } from "@/lib/attention-engine";

const LEVEL_UI: Record<AttentionLevel, { label: string; icon: LucideIcon; tone: string }> = {
  action_now: { label: "À faire maintenant", icon: CircleAlert, tone: "action-now" },
  anticipate: { label: "À anticiper", icon: BellRing, tone: "anticipate" },
  suggestion: { label: "Suggestion", icon: Sparkles, tone: "suggestion" },
  information: { label: "Information", icon: Info, tone: "information" },
};

export function AttentionCard({ level, levelLabel, title, description, meta, actionLabel, onAction, icon: CustomIcon, primary = false }: {
  level: AttentionLevel;
  levelLabel?: string;
  title: string;
  description?: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  primary?: boolean;
}) {
  const ui = LEVEL_UI[level];
  const Icon = CustomIcon ?? ui.icon;
  const content = (
    <>
      <div className={`dabo-attention-icon flex shrink-0 items-center justify-center rounded-lg ${primary ? "h-10 w-10" : "h-8 w-8"}`}>
        <Icon size={primary ? 18 : 16} strokeWidth={2} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="dabo-attention-accent mb-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">{levelLabel ?? ui.label}</div>
        <div className={`${primary ? "text-[15px]" : "text-[13px]"} font-semibold leading-snug text-ink`}>{title}</div>
        {description && <p className={`${primary ? "mt-1 text-xs" : "mt-0.5 text-[11px]"} leading-snug text-muted`}>{description}</p>}
        {meta && <p className="mt-1 text-[11px] font-medium text-muted">{meta}</p>}
        {actionLabel && <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink">{actionLabel}<ArrowRight size={14} aria-hidden="true" /></div>}
      </div>
    </>
  );

  const classes = `dabo-attention-card dabo-attention-${ui.tone} w-full rounded-2xl border text-left transition ${primary ? "dabo-organic-card px-4 py-4 shadow-[0_6px_20px_rgba(34,48,31,0.08)]" : "px-3 py-3 shadow-[0_1px_0_rgba(34,48,31,0.03)]"} ${onAction ? "cursor-pointer active:scale-[0.995]" : ""}`;
  return onAction ? <button type="button" onClick={onAction} className={classes}>{<div className={`flex items-start ${primary ? "gap-3" : "gap-2.5"}`}>{content}</div>}</button> : <article className={classes}><div className={`flex items-start ${primary ? "gap-3" : "gap-2.5"}`}>{content}</div></article>;
}

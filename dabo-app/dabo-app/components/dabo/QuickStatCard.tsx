import type { LucideIcon } from "lucide-react";

export function QuickStatCard({ value, label, hint, icon: Icon }: { value: string | number; label: string; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="min-w-0 rounded-2xl border border-borderLight bg-white2 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-serif text-xl font-semibold leading-none text-ink">{value}</div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</div>
          {hint && <div className="mt-1 text-[11px] leading-snug text-muted">{hint}</div>}
        </div>
        {Icon && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-paper text-muted"><Icon size={16} aria-hidden="true" /></div>}
      </div>
    </div>
  );
}

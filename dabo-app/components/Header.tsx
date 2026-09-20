"use client";

export function Header({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="dabo-brand-header dabo-organic-header relative overflow-hidden px-5 pt-8 pb-4">
      <div className="dabo-brand-orbit" aria-hidden="true">
        <span className="dabo-brand-leaf dabo-brand-leaf-a" />
        <span className="dabo-brand-leaf dabo-brand-leaf-b" />
        <span className="dabo-brand-sun" />
      </div>
      <div className="relative z-[1]">
        {eyebrow && <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{eyebrow}</div>}
        <h1 className="font-serif text-2xl text-ink">{title}</h1>
      </div>
    </div>
  );
}

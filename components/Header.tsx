"use client";

export function Header({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="px-5 pt-8 pb-4">
      {eyebrow && <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{eyebrow}</div>}
      <h1 className="font-serif text-2xl text-ink">{title}</h1>
    </div>
  );
}

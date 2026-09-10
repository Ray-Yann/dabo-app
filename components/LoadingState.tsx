"use client";

import Image from "next/image";

export function LoadingState() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Chargement de DABO">
      <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm animate-pulse">
        <Image src="/icon.svg" alt="" width={56} height={56} priority />
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

"use client";

import Link from "next/link";
import { House, ChevronRight, ShieldCheck } from "lucide-react";
import { useT } from "@/lib/language-context";

export default function SpacesPage() {
  const t = useT();
  return <main className="px-5 pb-28 pt-8 md:px-8">
    <p className="dabo-kicker">DABO Universal</p>
    <h1 className="mt-2 font-serif text-3xl font-semibold">{t("universal_tab_spaces")}</h1>
    <p className="mt-3 text-sm leading-6 text-muted">{t("universal_spaces_subtitle")}</p>
    <Link href="/app/foyer" className="mt-7 flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
      <House size={26} aria-hidden="true"/><span className="flex-1 font-semibold">{t("tab_my_household")}</span><ChevronRight size={20} aria-hidden="true"/>
    </Link>
    <div className="mt-5 flex gap-3 rounded-3xl border border-line p-5 text-sm leading-6 text-muted"><ShieldCheck className="shrink-0" size={22} aria-hidden="true"/><p>Les espaces personnels, groupes et associations nécessitent une évolution des permissions et de la base de données. Ils ne sont pas encore activés.</p></div>
  </main>;
}

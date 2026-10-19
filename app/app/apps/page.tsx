"use client";

import Link from "next/link";
import { CalendarDays, ShoppingBasket, ListChecks, Wallet, ArrowUpRight } from "lucide-react";
import { useT } from "@/lib/language-context";

const apps = [
  { href: "/app/calendrier", label: "tab_planning", icon: CalendarDays, description: "Calendrier et événements" },
  { href: "/app/courses", label: "tab_courses", icon: ShoppingBasket, description: "Listes et achats" },
  { href: "/app/taches", label: "tab_tasks", icon: ListChecks, description: "Tâches et routines" },
  { href: "/app/finances", label: "tab_finances", icon: Wallet, description: "Budgets et dépenses" },
] as const;

export default function UniversalAppsPage() {
  const t = useT();
  return <main className="px-5 pb-28 pt-8 md:px-8">
    <p className="dabo-kicker">DABO Universal</p>
    <h1 className="mt-2 font-serif text-3xl font-semibold">{t("universal_apps_title")}</h1>
    <p className="mt-3 text-sm text-muted">{t("tab_planning")} · {t("tab_courses")} · {t("tab_tasks")} · {t("tab_finances")}</p>
    <div className="mt-7 grid grid-cols-2 gap-3">
      {apps.map(({href,label,icon:Icon}) => <Link key={href} href={href} className="group flex min-h-36 flex-col justify-between rounded-3xl border border-line bg-surface p-5 transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
        <div className="flex items-start justify-between"><Icon aria-hidden="true" size={26}/><ArrowUpRight aria-hidden="true" size={17} className="text-muted"/></div>
        <span className="font-serif text-xl font-semibold">{t(label)}</span>
      </Link>)}
    </div>
    <p className="mt-6 text-sm leading-6 text-muted">{t("tab_balance")} · {t("tab_promos")} : <Link href="/app/equilibre" className="underline underline-offset-4">{t("tab_balance")}</Link> · <Link href="/app/promos" className="underline underline-offset-4">{t("tab_promos")}</Link></p>
  </main>;
}

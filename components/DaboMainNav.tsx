"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Home, Menu, Plus, UsersRound, X, ListChecks, ShoppingBag, PiggyBank, Settings, Scale, Tags } from "lucide-react";
import { UniversalAddSheet } from "@/components/UniversalAddSheet";
import { useT } from "@/lib/language-context";

export function DaboMainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const go = (href: string) => {
    setAddOpen(false);
    setMoreOpen(false);

    const targetPathname = href.split("?")[0]?.split("#")[0] || href;

    if (targetPathname === pathname && href !== pathname) {
      window.location.assign(href);
      return;
    }

    router.push(href);
  };

  const items = [
    { key: "today", href: "/app", icon: Home, label: t("tab_today") },
    { key: "planning", href: "/app/calendrier", icon: CalendarDays, label: t("tab_planning") },
    { key: "add", href: "", icon: Plus, label: t("tab_add") },
    { key: "household", href: "/app/foyer", icon: UsersRound, label: t("tab_my_household") },
    { key: "more", href: "", icon: Menu, label: t("tab_more") },
  ];

  const active = (href: string) => href && (pathname === href || (href !== "/app" && pathname.startsWith(href)));

  return <>
    <nav className="dabo-main-nav dabo-main-nav-v2 fixed bottom-0 left-0 right-0 z-40" aria-label={t("nav_main_aria")}>
      <div className="dabo-main-nav-grid mx-auto grid max-w-[760px] grid-cols-5 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isCenter = item.key === "add";
          const isActive = active(item.href);
          const onClick = item.key === "add" ? () => setAddOpen(true) : item.key === "more" ? () => setMoreOpen(true) : () => go(item.href);
          return <button key={item.key} type="button" onClick={onClick} aria-current={isActive ? "page" : undefined} aria-label={item.label} className={`dabo-main-nav-button ${isCenter ? "dabo-main-nav-add" : ""}`}>
            <span className={isCenter ? "dabo-main-nav-add-circle" : `dabo-main-nav-icon ${isActive ? "is-active" : ""}`}><Icon size={isCenter ? 26 : 22} strokeWidth={isCenter ? 2.4 : isActive ? 2.35 : 1.9}/></span>
            <span className={`dabo-main-nav-label ${isActive ? "is-active" : ""}`}>{item.label}</span>
          </button>;
        })}
      </div>
    </nav>

    {addOpen && <UniversalAddSheet onClose={() => setAddOpen(false)} onGo={go} />}

    {moreOpen && <div className="dabo-sheet-backdrop" onClick={() => setMoreOpen(false)}>
      <section className="dabo-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dabo-sheet-handle" />
        <div className="flex items-start justify-between"><div><p className="dabo-kicker">DABO</p><h2 className="font-serif text-2xl font-semibold">{t("tab_more")}</h2></div><button onClick={() => setMoreOpen(false)} className="dabo-icon-button" aria-label={t("nav_close")}><X size={19}/></button></div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => go("/app/taches")} className="dabo-action-tile"><ListChecks/><span>{t("tab_tasks")}</span></button>
          <button onClick={() => go("/app/courses")} className="dabo-action-tile"><ShoppingBag/><span>{t("tab_courses")}</span></button>
          <button onClick={() => go("/app/finances")} className="dabo-action-tile"><PiggyBank/><span>{t("tab_finances")}</span></button>
          <button onClick={() => go("/app/equilibre")} className="dabo-action-tile"><Scale/><span>{t("tab_balance")}</span></button>
          <button onClick={() => go("/app/promos")} className="dabo-action-tile"><Tags/><span>{t("tab_promos")}</span></button>
          <button onClick={() => go("/app/reglages")} className="dabo-action-tile"><Settings/><span>{t("tab_settings")}</span></button>
        </div>
      </section>
    </div>}
  </>;
}

"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, Plus, UsersRound, UserRound } from "lucide-react";
import { UniversalAddSheet } from "@/components/UniversalAddSheet";
import { useT } from "@/lib/language-context";

export function DaboMainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [addOpen, setAddOpen] = useState(false);

  const go = (href: string) => {
    setAddOpen(false);

    const targetPathname = href.split("?")[0]?.split("#")[0] || href;

    if (targetPathname === pathname && href !== pathname) {
      window.location.assign(href);
      return;
    }

    router.push(href);
  };

  const items = [
    { key: "today", href: "/app", icon: Home, label: t("tab_today") },
    { key: "apps", href: "/app/apps", icon: LayoutGrid, label: t("universal_tab_apps") },
    { key: "add", href: "", icon: Plus, label: t("tab_add") },
    { key: "spaces", href: "/app/espaces", icon: UsersRound, label: t("universal_tab_spaces") },
    { key: "me", href: "/app/moi", icon: UserRound, label: t("universal_tab_me") },
  ];

  const active = (href: string) => href && (pathname === href || (href !== "/app" && pathname.startsWith(href)));

  return <>
    <nav className="dabo-main-nav dabo-main-nav-v2 fixed bottom-0 left-0 right-0 z-40" aria-label={t("nav_main_aria")}>
      <div className="dabo-main-nav-grid mx-auto grid max-w-[760px] grid-cols-5 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isCenter = item.key === "add";
          const isActive = active(item.href);
          const onClick = item.key === "add" ? () => setAddOpen(true) : () => go(item.href);
          return <button key={item.key} type="button" onClick={onClick} aria-current={isActive ? "page" : undefined} aria-label={item.label} className={`dabo-main-nav-button ${isCenter ? "dabo-main-nav-add" : ""}`}>
            <span className={isCenter ? "dabo-main-nav-add-circle" : `dabo-main-nav-icon ${isActive ? "is-active" : ""}`}><Icon size={isCenter ? 26 : 22} strokeWidth={isCenter ? 2.4 : isActive ? 2.35 : 1.9}/></span>
            <span className={`dabo-main-nav-label ${isActive ? "is-active" : ""}`}>{item.label}</span>
          </button>;
        })}
      </div>
    </nav>

    {addOpen && <UniversalAddSheet onClose={() => setAddOpen(false)} onGo={go} />}

  </>;
}

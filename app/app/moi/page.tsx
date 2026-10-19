"use client";

import Link from "next/link";
import { UserRound, Settings, Bell, ShieldCheck, ChevronRight } from "lucide-react";
import { useT } from "@/lib/language-context";

export default function MePage() {
  const t = useT();
  const links = [
    { href: "/app/reglages", label: "tab_settings", icon: Settings },
    { href: "/app/reglages", label: "Notifications", icon: Bell },
    { href: "/app/reglages", label: "Confidentialité et sécurité", icon: ShieldCheck },
  ];
  return <main className="px-5 pb-28 pt-8 md:px-8">
    <p className="dabo-kicker">DABO Universal</p>
    <h1 className="mt-2 font-serif text-3xl font-semibold">{t("universal_tab_me")}</h1>
    <p className="mt-3 text-sm text-muted">{t("universal_me_subtitle")}</p>
    <div className="mt-7 rounded-3xl border border-line bg-surface p-5"><div className="flex items-center gap-3"><UserRound size={27} aria-hidden="true"/><span className="font-semibold">{t("universal_tab_me")}</span></div></div>
    <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-surface">
      {links.map(({href,label,icon:Icon},index) => <Link key={label} href={href} className={`flex items-center gap-3 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${index ? "border-t border-line" : ""}`}><Icon size={21} aria-hidden="true"/><span className="flex-1 text-sm font-medium">{label === "tab_settings" ? t(label) : label}</span><ChevronRight size={18} aria-hidden="true"/></Link>)}
    </div>
  </main>;
}

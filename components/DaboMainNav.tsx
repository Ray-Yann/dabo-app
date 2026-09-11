"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, GripVertical, Home, ListChecks, Menu, PiggyBank, Scale, Settings, ShoppingBag, Tags, X } from "lucide-react";
import { useT } from "@/lib/language-context";
import { useHousehold } from "@/lib/use-household";

type TabKey = "tasks" | "courses" | "calendar" | "finances" | "balance" | "promos";
const DEFAULT_TABS: TabKey[] = ["tasks", "courses", "calendar", "finances"];

export function DaboMainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const { me, supabase } = useHousehold();
  const [pinned, setPinned] = useState<TabKey[]>(DEFAULT_TABS);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const catalog = useMemo(() => ({
    tasks: { href: "/app/taches", icon: ListChecks, label: t("tab_tasks") },
    courses: { href: "/app/courses", icon: ShoppingBag, label: t("tab_courses") },
    calendar: { href: "/app/calendrier", icon: Calendar, label: t("tab_calendar") },
    finances: { href: "/app/finances", icon: PiggyBank, label: t("tab_finances") },
    balance: { href: "/app/equilibre", icon: Scale, label: t("tab_balance") },
    promos: { href: "/app/promos", icon: Tags, label: t("tab_promos") },
  }), [t]);

  useEffect(() => {
    if (!me?.user_id) return;
    supabase.from("user_navigation_preferences").select("pinned_tabs").eq("user_id", me.user_id).maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error("DABO navigation preference load failed", error); return; }
        const tabs = (data?.pinned_tabs || []).filter((key: string): key is TabKey => key in catalog);
        if (tabs.length === 4 && new Set(tabs).size === 4) setPinned(tabs);
      });
  }, [me?.user_id, supabase, catalog]);

  async function save(next: TabKey[]) {
    if (!me?.user_id || next.length !== 4 || new Set(next).size !== 4) return;
    setPinned(next);
    const { error } = await supabase.from("user_navigation_preferences").upsert({ user_id: me.user_id, pinned_tabs: next, updated_at: new Date().toISOString() });
    if (error) console.error("DABO navigation preference save failed", error);
  }

  function swap(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pinned.length) return;
    const next = [...pinned];
    [next[index], next[target]] = [next[target], next[index]];
    void save(next);
  }

  function replace(slot: number, key: TabKey) {
    if (pinned.includes(key)) return;
    const next = [...pinned]; next[slot] = key; void save(next);
  }

  const navItems = [
    { key: "today", href: "/app", icon: Home, label: t("tab_today") },
    ...pinned.map(key => ({ key, ...catalog[key] })),
  ];
  const hidden = (Object.keys(catalog) as TabKey[]).filter(key => !pinned.includes(key));

  const go = (href: string) => { setMoreOpen(false); setEditing(false); router.push(href); };
  const isActive = (href: string) => pathname === href || (href === "/app/equilibre" && pathname.startsWith("/app/equilibre")) || (href === "/app/finances" && pathname === "/app/equilibre/budget");

  return <>
    <nav className="dabo-main-nav fixed bottom-0 left-0 right-0 z-40 bg-paper border-t border-borderLight" aria-label={t("nav_main_aria")}>
      <div className="dabo-main-nav-grid max-w-lg md:max-w-3xl mx-auto grid grid-cols-6">
        {navItems.map(item => { const Icon=item.icon; const active=isActive(item.href); return <button key={item.key} onClick={()=>go(item.href)} aria-current={active?"page":undefined} aria-label={item.label} className="dabo-main-nav-button group flex min-h-[64px] min-w-0 flex-col items-center justify-center px-0.5 py-2"><span className={`dabo-main-nav-pill flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 transition-colors ${active?"bg-ink text-paper shadow-sm":"text-muted group-hover:bg-white2 group-hover:text-ink"}`}><Icon size={21} strokeWidth={active?2.5:2}/><span className={`dabo-main-nav-label ${item.key==="today"?"dabo-main-nav-label-today":""} ${item.key==="calendar"?"text-[9px]":"text-[9.5px]"} leading-tight ${active?"font-semibold":"font-medium"}`}>{item.label}</span></span></button> })}
        <button onClick={()=>setMoreOpen(true)} aria-label={t("tab_more")} className="dabo-main-nav-button group flex min-h-[64px] min-w-0 flex-col items-center justify-center px-0.5 py-2"><span className="dabo-main-nav-pill flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 text-muted"><Menu size={21}/><span className="dabo-main-nav-label text-[9.5px] leading-tight font-medium">{t("tab_more")}</span></span></button>
      </div>
    </nav>

    {moreOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25" onClick={()=>setMoreOpen(false)}><section className="w-full max-w-lg rounded-t-[28px] bg-paper px-5 pb-7 pt-4 shadow-2xl" onClick={e=>e.stopPropagation()} aria-modal="true" role="dialog"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted">DABO</p><h2 className="font-serif text-xl">{editing?t("nav_customize_title"):t("tab_more")}</h2></div><button onClick={()=>setMoreOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white2" aria-label={t("nav_close")}><X size={18}/></button></div>
      {!editing ? <><div className="mt-5 grid grid-cols-2 gap-2">{hidden.map(key=>{const item=catalog[key];const Icon=item.icon;return <button key={key} onClick={()=>go(item.href)} className="flex items-center gap-3 rounded-2xl border border-borderLight bg-white2 px-4 py-4 text-left"><Icon size={19}/><span className="text-sm font-semibold">{item.label}</span></button>})}<button onClick={()=>go("/app/reglages")} className="flex items-center gap-3 rounded-2xl border border-borderLight bg-white2 px-4 py-4 text-left"><Settings size={19}/><span className="text-sm font-semibold">{t("tab_settings")}</span></button></div><button onClick={()=>setEditing(true)} className="mt-4 w-full rounded-2xl border border-borderLight px-4 py-3 text-sm font-semibold">{t("nav_customize_action")}</button></>
      : <div className="mt-5 space-y-3"><p className="text-sm leading-relaxed text-muted">{t("nav_customize_help")}</p><div className="rounded-2xl border border-borderLight bg-white2 p-3"><div className="flex items-center gap-3 rounded-xl bg-paper px-3 py-3"><Home size={18}/><span className="flex-1 text-sm font-semibold">{t("tab_today")}</span><span className="text-xs text-muted">{t("nav_locked")}</span></div>{pinned.map((key,index)=>{const item=catalog[key];const Icon=item.icon;return <div key={key} className="mt-2 flex items-center gap-2 rounded-xl bg-paper px-2 py-2"><GripVertical size={16} className="text-muted"/><Icon size={18}/><select value={key} onChange={e=>replace(index,e.target.value as TabKey)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none">{(Object.keys(catalog) as TabKey[]).map(candidate=><option key={candidate} value={candidate} disabled={candidate!==key&&pinned.includes(candidate)}>{catalog[candidate].label}</option>)}</select><button disabled={index===0} onClick={()=>swap(index,-1)} className="h-8 w-8 rounded-lg bg-white2 disabled:opacity-25">↑</button><button disabled={index===pinned.length-1} onClick={()=>swap(index,1)} className="h-8 w-8 rounded-lg bg-white2 disabled:opacity-25">↓</button></div>})}</div><button onClick={()=>setEditing(false)} className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-paper">{t("nav_done")}</button></div>}
      </section></div>}
  </>;
}

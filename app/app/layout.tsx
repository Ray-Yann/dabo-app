"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, ShoppingBag, ListChecks, Scale, Settings, Tag } from "lucide-react";
import { useHousehold } from "@/lib/use-household";
import { LanguageProvider, useT } from "@/lib/language-context";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  const TABS = [
    { href: "/app", icon: Home, label: t("tab_today") },
    { href: "/app/courses", icon: ShoppingBag, label: t("tab_courses") },
    { href: "/app/taches", icon: ListChecks, label: t("tab_tasks") },
    { href: "/app/equilibre", icon: Scale, label: t("tab_balance") },
    { href: "/app/promos", icon: Tag, label: t("tab_promos") },
    { href: "/app/reglages", icon: Settings, label: t("tab_settings") },
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="flex-1 max-w-lg mx-auto w-full pb-24">{children}</div>
      <div className="fixed bottom-0 left-0 right-0 bg-paper border-t border-borderLight">
        <div className="max-w-lg mx-auto grid grid-cols-6">
          {TABS.map((t2) => {
            const Icon = t2.icon;
            const active = pathname === t2.href;
            return (
              <button
                key={t2.href}
                onClick={() => router.push(t2.href)}
                className="flex flex-col items-center justify-center py-3 gap-1"
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 1.8} className={active ? "text-ink" : "text-border"} />
                <span className={`text-[9px] ${active ? "text-ink font-medium" : "text-border"}`}>{t2.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { me } = useHousehold();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", !!me?.dark_mode);
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [me?.dark_mode]);

  return (
    <LanguageProvider lang={me?.language || "fr"}>
      <AppShell>{children}</AppShell>
    </LanguageProvider>
  );
}

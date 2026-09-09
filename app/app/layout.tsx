"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, ShoppingBag, ListChecks, Scale, Settings, Calendar } from "lucide-react";
import { useHousehold } from "@/lib/use-household";
import { HouseholdProvider } from "@/lib/household-context";
import { LanguageProvider, useT } from "@/lib/language-context";

function AppShell({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  const TABS = [
    { href: "/app", icon: Home, label: t("tab_today") },
    { href: "/app/courses", icon: ShoppingBag, label: t("tab_courses") },
    { href: "/app/taches", icon: ListChecks, label: t("tab_tasks") },
    { href: "/app/equilibre", icon: Scale, label: t("tab_balance") },
    { href: "/app/calendrier", icon: Calendar, label: t("tab_calendar") },
    { href: "/app/reglages", icon: Settings, label: t("tab_settings") },
  ];

  return (
    <div className={`${dark ? "dabo-dark" : "dabo-light"} dabo-user-app dabo-app-frame min-h-[100dvh] bg-paper text-ink flex flex-col`}>
      <div className="dabo-app-content flex-1 max-w-lg mx-auto w-full">{children}</div>
      <nav className="dabo-main-nav fixed bottom-0 left-0 right-0 z-40 bg-paper border-t border-borderLight" aria-label="Navigation principale">
        <div className="dabo-main-nav-grid max-w-lg mx-auto grid grid-cols-6">
          {TABS.map((t2) => {
            const Icon = t2.icon;
            const active = pathname === t2.href || (t2.href === "/app/equilibre" && pathname.startsWith("/app/equilibre/"));
            return (
              <button
                key={t2.href}
                onClick={() => router.push(t2.href)}
                aria-current={active ? "page" : undefined}
                aria-label={t2.label}
                className="dabo-main-nav-button group flex min-h-[64px] min-w-0 flex-col items-center justify-center px-0.5 py-2"
              >
                <span
                  className={`dabo-main-nav-pill flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 transition-colors ${
                    active
                      ? "bg-ink text-paper shadow-sm"
                      : "text-muted group-hover:bg-white2 group-hover:text-ink"
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                  <span className={`dabo-main-nav-label ${t2.href === "/app" ? "dabo-main-nav-label-today" : ""} text-[10px] leading-tight ${active ? "font-semibold" : "font-medium"}`}>
                    {t2.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HouseholdProvider>
      <AppShellWithLanguage>{children}</AppShellWithLanguage>
    </HouseholdProvider>
  );
}

function AppShellWithLanguage({ children }: { children: React.ReactNode }) {
  const { me } = useHousehold();

  useEffect(() => {
    const root = document.documentElement;
    const dark = !!me?.dark_mode;

    // La préférence DABO doit primer sur le thème du téléphone/navigateur.
    // `only light` empêche notamment l’auto-darkening de Samsung Internet
    // quand le membre a explicitement désactivé le mode sombre dans DABO.
    root.classList.remove("dark");
    root.dataset.daboTheme = dark ? "dark" : "light";
    root.style.colorScheme = dark ? "dark" : "only light";

    return () => {
      delete root.dataset.daboTheme;
      root.classList.remove("dark");
      root.style.colorScheme = "only light";
    };
  }, [me?.dark_mode]);

  return (
    <LanguageProvider lang={me?.language || "fr"}>
      <AppShell dark={!!me?.dark_mode}>{children}</AppShell>
    </LanguageProvider>
  );
}

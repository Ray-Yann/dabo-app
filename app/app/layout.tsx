"use client";

import { useEffect } from "react";
import { useHousehold } from "@/lib/use-household";
import { HouseholdProvider } from "@/lib/household-context";
import { LanguageProvider } from "@/lib/language-context";
import { DaboMainNav } from "@/components/DaboMainNav";

function AppShell({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  return (
    <div className={`${dark ? "dabo-dark" : "dabo-light"} dabo-user-app dabo-app-frame min-h-[100dvh] bg-paper text-ink flex flex-col`}>
      <div className="dabo-app-content flex-1 max-w-lg mx-auto w-full">{children}</div>
      <DaboMainNav />
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

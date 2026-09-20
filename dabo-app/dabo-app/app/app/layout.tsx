"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useHousehold } from "@/lib/use-household";
import { HouseholdProvider } from "@/lib/household-context";
import { LanguageProvider, useT } from "@/lib/language-context";
import { DaboMainNav } from "@/components/DaboMainNav";
import { LoadingState } from "@/components/LoadingState";
import { detectAvailableLanguageFromDevice } from "@/lib/languages";
import type { Lang } from "@/lib/i18n";

function AppShell({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  return (
    <div className={`${dark ? "dabo-dark" : "dabo-light"} dabo-user-app dabo-app-frame min-h-[100dvh] bg-paper text-ink flex flex-col`}>
      <div className="dabo-app-content flex-1 w-full max-w-lg md:max-w-3xl mx-auto">{children}</div>
      <DaboMainNav />
    </div>
  );
}

function HouseholdLoadError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <main className="min-h-[100dvh] bg-paper text-ink flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-line bg-surface p-7 text-center shadow-sm" role="alert">
        <Image src="/icon.svg" alt="DABO" width={64} height={64} className="mx-auto rounded-2xl" priority />
        <h1 className="mt-5 font-serif text-2xl font-semibold">{t("household_load_error_title")}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{t("household_load_error_body")}</p>
        <button type="button" onClick={onRetry} className="mt-6 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper">
          {t("household_load_retry")}
        </button>
      </section>
    </main>
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
  const { me, loading, loadError, retry } = useHousehold();
  const [fallbackLang, setFallbackLang] = useState<Lang>("fr");

  useEffect(() => { setFallbackLang(detectAvailableLanguageFromDevice()); }, []);

  useEffect(() => {
    const root = document.documentElement;
    const dark = !!me?.dark_mode;
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
    <LanguageProvider lang={me?.language || fallbackLang}>
      {loading ? (
        <div className="min-h-[100dvh] bg-paper flex items-center justify-center"><LoadingState /></div>
      ) : loadError ? (
        <HouseholdLoadError onRetry={() => void retry()} />
      ) : (
        <AppShell dark={!!me?.dark_mode}>{children}</AppShell>
      )}
    </LanguageProvider>
  );
}

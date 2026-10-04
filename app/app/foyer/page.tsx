"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Scale, Settings, UserRoundPlus, UsersRound } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { useT } from "@/lib/language-context";

export default function HouseholdPage() {
  const { loading, household, me, members } = useHousehold();
  const router = useRouter();
  const t = useT();
  if (loading || !household || !me) return <LoadingState />;

  return <main className="dabo-v2-page mx-auto w-full max-w-3xl px-5 pb-8 pt-8 sm:px-7 lg:px-10">
    <header className="mb-8">
      <p className="dabo-kicker">DABO</p>
      <h1 className="font-serif text-3xl font-semibold tracking-[-0.02em] text-ink">{t("tab_my_household")}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">{t("settings_household_desc")}</p>
    </header>

    <section className="dabo-v2-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("settings_household")}</p><h2 className="mt-1 font-serif text-2xl font-semibold">{household.name}</h2></div>
        <span className="dabo-soft-icon"><UsersRound size={20}/></span>
      </div>
      <div className="mt-5 space-y-1">
        {members.map((member) => <div key={member.id} className="flex min-h-14 items-center gap-3 border-b border-borderLight py-3 last:border-0">
          <Avatar member={member} members={members} size={40}/>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink">{member.first_name}</p>{member.id === me.id && <p className="text-xs text-muted">{t("settings_you")}</p>}</div>
        </div>)}
      </div>
      <button onClick={() => router.push("/app/reglages")} className="dabo-secondary-action mt-5 w-full"><UserRoundPlus size={18}/>{t("settings_members")}</button>
    </section>

    <section className="mt-5 grid gap-3 sm:grid-cols-2">
      <button onClick={() => router.push("/app/equilibre")} className="dabo-v2-link-card"><span className="dabo-soft-icon"><Scale size={19}/></span><span className="min-w-0 flex-1 text-left"><strong className="block">{t("tab_balance")}</strong><span className="text-xs text-muted">{t("weekly_report_balance_note")}</span></span><ChevronRight size={18}/></button>
      <button onClick={() => router.push("/app/reglages")} className="dabo-v2-link-card"><span className="dabo-soft-icon"><Settings size={19}/></span><span className="min-w-0 flex-1 text-left"><strong className="block">{t("tab_settings")}</strong><span className="text-xs text-muted">{t("settings_household_desc")}</span></span><ChevronRight size={18}/></button>
    </section>
  </main>;
}

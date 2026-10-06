"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, HouseHeart, Scale, Settings, Sparkles, UserRoundPlus, UsersRound } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { useT } from "@/lib/language-context";

export default function HouseholdPage() {
  const { loading, household, me, members } = useHousehold();
  const router = useRouter();
  const t = useT();
  if (loading || !household || !me) return <LoadingState />;

  const memberCountLabel = t("household_hub_member_count").replace("{count}", String(members.length));

  return <main className="dabo-v2-page mx-auto w-full max-w-3xl px-5 pb-8 pt-8 sm:px-7 lg:px-10">
    <header className="mb-8">
      <p className="dabo-kicker">DABO</p>
      <h1 className="font-serif text-3xl font-semibold tracking-[-0.02em] text-ink">{t("tab_my_household")}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">{t("household_hub_intro")}</p>
    </header>

    <section className="dabo-v2-panel overflow-hidden p-0">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("household_hub_identity")}</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold">{household.name}</h2>
            <p className="mt-1 text-xs text-muted">{memberCountLabel}</p>
          </div>
          <span className="dabo-soft-icon" aria-hidden="true"><HouseHeart size={20}/></span>
        </div>

        <div className="mt-5 divide-y divide-borderLight">
          {members.map((member) => <div key={member.id} className="flex min-h-16 items-center gap-3 py-3">
            <Avatar member={member} members={members} size={42}/>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{member.first_name}</p>
              <p className="text-xs text-muted">{member.id === me.id ? t("settings_you") : t("household_hub_member")}</p>
            </div>
          </div>)}
        </div>

        <button onClick={() => router.push("/app/reglages")} className="dabo-secondary-action mt-4 w-full">
          <UserRoundPlus size={18}/>{t("settings_members")}
        </button>
      </div>
    </section>

    <section className="mt-5 rounded-[1.75rem] border border-borderLight bg-white2/70 p-5 shadow-[0_18px_45px_rgba(42,51,37,0.06)] sm:p-6" aria-labelledby="household-now-title">
      <div className="flex items-start gap-3">
        <span className="dabo-soft-icon shrink-0" aria-hidden="true"><Sparkles size={19}/></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("household_hub_now_eyebrow")}</p>
          <h2 id="household-now-title" className="mt-1 font-serif text-xl font-semibold text-ink">{t("household_hub_now_title")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{t("household_hub_now_desc")}</p>
        </div>
      </div>
      <button onClick={() => router.push("/app/bilan")} className="dabo-primary-action mt-5 w-full justify-center">
        {t("household_hub_open_report")}<ChevronRight size={18}/>
      </button>
      <p className="mt-3 text-xs leading-5 text-muted">{t("household_hub_control_note")}</p>
    </section>

    <section className="mt-5" aria-labelledby="household-tools-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="household-tools-title" className="font-serif text-lg font-semibold text-ink">{t("household_hub_tools")}</h2>
        <span className="text-xs text-muted"><UsersRound size={16} aria-hidden="true"/></span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => router.push("/app/equilibre")} className="dabo-v2-link-card">
          <span className="dabo-soft-icon"><Scale size={19}/></span>
          <span className="min-w-0 flex-1 text-left"><strong className="block">{t("tab_balance")}</strong><span className="text-xs text-muted">{t("weekly_report_balance_note")}</span></span>
          <ChevronRight size={18}/>
        </button>
        <button onClick={() => router.push("/app/reglages")} className="dabo-v2-link-card">
          <span className="dabo-soft-icon"><Settings size={19}/></span>
          <span className="min-w-0 flex-1 text-left"><strong className="block">{t("tab_settings")}</strong><span className="text-xs text-muted">{t("settings_household_desc")}</span></span>
          <ChevronRight size={18}/>
        </button>
      </div>
    </section>
  </main>;
}

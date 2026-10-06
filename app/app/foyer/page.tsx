"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Copy, HouseHeart, Scale, Settings, Share2, Sparkles, UserRoundPlus, UsersRound, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { useT } from "@/lib/language-context";
import { QRCodeSVG } from "qrcode.react";

export default function HouseholdPage() {
  const { loading, household, me, members } = useHousehold();
  const router = useRouter();
  const t = useT();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (loading || !household || !me) return <LoadingState />;

  const memberCountLabel = t("household_hub_member_count").replace("{count}", String(members.length));
  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?invite=${encodeURIComponent(household.invite_code)}`
    : "";
  const inviteText = t("settings_invite_share_message")
    .replace("{household}", household.name)
    .replace("{code}", household.invite_code);

  async function copyInviteLink() {
    try {
      if (!navigator.clipboard || !inviteUrl) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "DABO", text: inviteText, url: inviteUrl });
      } catch {
        // Partage annulé : le foyer reste inchangé.
      }
      return;
    }
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(`${inviteText} ${inviteUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

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

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button onClick={() => setInviteOpen(true)} className="dabo-primary-action w-full justify-center">
            <UserRoundPlus size={18}/>{t("settings_invite_member")}
          </button>
          <button onClick={() => router.push("/app/reglages#dabo-members")} className="dabo-secondary-action w-full justify-center">
            <UsersRound size={18}/>{t("settings_members")}
          </button>
        </div>
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

    {inviteOpen && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/35 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="household-invite-title" className="w-full max-w-md rounded-t-[1.75rem] border border-borderLight bg-paper p-5 shadow-2xl sm:rounded-[1.75rem] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="dabo-kicker">DABO</p>
            <h2 id="household-invite-title" className="font-serif text-2xl font-semibold text-ink">{t("settings_invite_member")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{t("settings_invite_desc")}</p>
          </div>
          <button type="button" onClick={() => setInviteOpen(false)} className="rounded-full p-2 text-muted hover:bg-white2" aria-label={t("cancel")}><X size={20}/></button>
        </div>

        {inviteUrl && <div className="mt-5 rounded-2xl border border-borderLight bg-white2 p-4 text-center">
          <p className="text-sm font-semibold text-ink">{t("settings_invite_qr_title")}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{t("settings_invite_qr_hint")}</p>
          <div className="mx-auto mt-3 flex w-fit items-center justify-center rounded-2xl bg-white p-2">
            <QRCodeSVG value={inviteUrl} size={184} level="M" marginSize={4} title={t("settings_invite_qr_title")}/>
          </div>
        </div>}

        <div className="mt-3 rounded-2xl border border-borderLight bg-white2 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t("onboarding_invite_code_label")}</p>
          <p className="mt-1 font-mono text-base font-semibold tracking-wider text-ink">{household.invite_code}</p>
          {inviteUrl && <p className="mt-2 truncate text-xs text-muted">{inviteUrl}</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void copyInviteLink()} className="dabo-secondary-action w-full justify-center">
            <Copy size={17}/>{copied ? t("copied") : t("copy")}
          </button>
          <button type="button" onClick={() => void shareInvite()} className="dabo-primary-action w-full justify-center">
            <Share2 size={17}/>{t("settings_share_invite")}
          </button>
        </div>
      </section>
    </div>}

  </main>;
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { Copy, LogOut, Bell, Check, UserMinus } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { enableNotifications } from "@/lib/notifications";
import { MEMBER_COLORS } from "@/lib/utils";
import { useT } from "@/lib/language-context";
import { Lang } from "@/lib/i18n";

export default function SettingsPage() {
  const { loading, household, me, members, supabase, refresh } = useHousehold();
  const router = useRouter();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [notifError, setNotifError] = useState("");
  const [firstName, setFirstName] = useState(me?.first_name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (me) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFirstName(me.first_name);
    }
  }, [me?.id]);

  async function saveProfile() {
    if (!me || !firstName.trim()) return;
    setSavingProfile(true);
    const { error } = await supabase.from("members").update({ first_name: firstName.trim() }).eq("id", me.id);
    setSavingProfile(false);
    if (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
      return;
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1500);
    refresh();
  }

  async function chooseColor(color: string) {
    if (!me) return;
    const { error } = await supabase.from("members").update({ avatar_color: color }).eq("id", me.id);
    if (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
      return;
    }
    refresh();
  }

  async function chooseLanguage(lang: Lang) {
    if (!me) return;
    await supabase.from("members").update({ language: lang }).eq("id", me.id);
    refresh();
  }

  async function handleEnableNotifications() {
    if (!me) return;
    setNotifStatus("loading");
    setNotifError("");
    try {
      await enableNotifications(supabase, me.id);
      setNotifStatus("done");
    } catch (e: unknown) {
      setNotifError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setNotifStatus("error");
    }
  }

  async function toggleEquity() {
    if (!household) return;
    await supabase.from("households").update({ equity_score_enabled: !household.equity_score_enabled }).eq("id", household.id);
    refresh();
  }
  async function changeType(type: string) {
    if (!household) return;
    await supabase.from("households").update({ household_type: type }).eq("id", household.id);
    refresh();
  }
  function copyCode() {
    if (!household) return;
    navigator.clipboard?.writeText(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function removeMember(memberId: string, name: string) {
    if (!confirm(t("confirm_remove_member").replace("{name}", name))) return;
    const { error } = await supabase.from("members").delete().eq("id", memberId);
    if (error) {
      alert("Erreur lors du retrait : " + error.message);
      return;
    }
    refresh();
  }

  async function leaveHousehold() {
    if (!me) return;
    if (!confirm(t("confirm_leave"))) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await fetch("/api/leave-household", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    router.replace("/");
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  async function deleteAccount() {
    if (!confirm(t("confirm_delete_account_1"))) return;
    if (!confirm(t("confirm_delete_account_2"))) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const res = await fetch("/api/delete-account", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert("Erreur lors de la suppression : " + (body.error || "erreur inconnue"));
      return;
    }
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading || !household || !me) return <div className="p-8 text-center text-muted">Chargement…</div>;

  const LANGUAGES: { code: Lang; label: string }[] = [
    { code: "fr", label: "Français" },
    { code: "nl", label: "Nederlands" },
    { code: "en", label: "English" },
  ];

  return (
    <div>
      <Header title={t("settings_title")} />
      <IntroTip id="settings" text={t("intro_settings")} />

      <div className="px-5 space-y-3">
        <div className="bg-white2 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-3 flex items-center gap-2">
            <Avatar member={me} members={members} size={20} /> {t("settings_my_profile")}
          </div>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink mb-3"
          />
          <div className="text-xs text-muted mb-2">{t("settings_avatar_color")}</div>
          <div className="flex gap-2 mb-3">
            {MEMBER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => chooseColor(c)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: c }}
              >
                {me.avatar_color === c && <Check size={14} color="#F0EFE6" />}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted mb-2">{t("settings_language")}</div>
          <div className="flex gap-2 mb-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => chooseLanguage(l.code)}
                className={`px-3 py-1.5 rounded-full text-xs border ${me.language === l.code ? "bg-ink text-paper border-ink" : "border-border text-muted"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button onClick={saveProfile} disabled={savingProfile || !firstName.trim()} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
            {savingProfile ? "..." : profileSaved ? t("copied") : t("save")}
          </button>
        </div>

        <div className="bg-white2 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">{t("settings_invite")}</div>
          <p className="text-xs text-muted mb-2">{t("settings_invite_desc")}</p>
          <div className="flex items-center justify-between bg-paper rounded-xl px-3 py-2">
            <span className="font-mono text-sm text-ink">{household.invite_code}</span>
            <button onClick={copyCode} className="flex items-center gap-1 text-xs text-muted">
              <Copy size={14} /> {copied ? t("copied") : t("copy")}
            </button>
          </div>
        </div>

        <div className="bg-white2 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{t("settings_household")}</div>
          <div className="text-sm text-ink mb-3">{household.name}</div>
          <select
            value={household.household_type}
            onChange={(e) => changeType(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink"
          >
            <option value="couple">{t("household_couple")}</option>
            <option value="coloc">{t("household_coloc")}</option>
            <option value="famille">{t("household_famille")}</option>
          </select>
        </div>

        <div className="bg-white2 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">{t("settings_members")}</div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar member={m} members={members} size={20} />
                  <span className="text-sm text-ink">{m.first_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{m.role === "creator" ? t("settings_creator") : t("settings_member")}</span>
                  {me.role === "creator" && m.id !== me.id && (
                    <button onClick={() => removeMember(m.id, m.first_name)} className="text-muted">
                      <UserMinus size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white2 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-ink font-medium">{t("settings_equity_toggle")}</div>
            <div className="text-xs text-muted">{t("settings_equity_toggle_desc")}</div>
          </div>
          <button
            onClick={toggleEquity}
            className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${household.equity_score_enabled ? "bg-ink" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-paper rounded-full transition-all ${household.equity_score_enabled ? "left-5" : "left-0.5"}`} />
          </button>
        </div>

        <div className="bg-white2 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-ink font-medium flex items-center gap-2"><Bell size={15} /> {t("settings_notifications")}</div>
          </div>
          <p className="text-xs text-muted mb-3">
            {notifStatus === "done" ? t("settings_notifications_done") : t("settings_notifications_desc")}
          </p>
          {notifStatus !== "done" && (
            <button onClick={handleEnableNotifications} disabled={notifStatus === "loading"} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
              {notifStatus === "loading" ? "..." : t("settings_notifications_enable")}
            </button>
          )}
          {notifStatus === "error" && <p className="text-xs text-red-700 mt-2">{notifError}</p>}
        </div>

        <button onClick={leaveHousehold} className="w-full border border-border rounded-xl py-3 text-sm text-muted flex items-center justify-center gap-2 mt-4">
          <LogOut size={14} /> {t("settings_leave")}
        </button>
        <button onClick={signOut} className="w-full text-sm text-muted py-2">
          {t("settings_signout")}
        </button>
        <button onClick={deleteAccount} className="w-full text-xs text-red-700/70 py-2 mt-2">
          {t("settings_delete_account")}
        </button>
      </div>
    </div>
  );
}

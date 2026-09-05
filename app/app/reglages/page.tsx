"use client";

import { useState, useEffect } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useRouter } from "next/navigation";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { Copy, LogOut, Bell, Check, UserMinus, ShieldPlus, Pencil, MoreHorizontal, Share2 } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { enableNotifications, disableNotifications } from "@/lib/notifications";
import { MEMBER_COLORS } from "@/lib/utils";
import { useT } from "@/lib/language-context";
import { Lang } from "@/lib/i18n";

type SettingsConfirmation =
  | { kind: "promote"; memberId: string; name: string }
  | { kind: "remove"; memberId: string; name: string }
  | { kind: "leave" }
  | { kind: "delete" };

export default function SettingsPage() {
  const { loading, household, me, members, supabase, refresh } = useHousehold();
  const router = useRouter();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"idle" | "loading" | "done" | "error" | "checking" | "blocked" | "unsupported">("checking");
  const [notifError, setNotifError] = useState("");
  const [firstName, setFirstName] = useState(me?.first_name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [householdName, setHouseholdName] = useState(household?.name || "");
  const [savingHouseholdName, setSavingHouseholdName] = useState(false);
  const [householdNameSaved, setHouseholdNameSaved] = useState(false);
  const [editingHouseholdName, setEditingHouseholdName] = useState(false);
  const [editingHouseholdType, setEditingHouseholdType] = useState(false);
  const [householdType, setHouseholdType] = useState(household?.household_type || "couple");
  const [memberActionsId, setMemberActionsId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<SettingsConfirmation | null>(null);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function showFeedback(type: "success" | "error", text: string) {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 3500);
  }

  function closeConfirmation() {
    if (confirmationLoading) return;
    setConfirmation(null);
    setDeletePhrase("");
  }

  useEffect(() => {
    if (me) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFirstName(me.first_name);
    }
  }, [me?.id]);

  useEffect(() => {
    if (household) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHouseholdName(household.name);
      setHouseholdType(household.household_type);
    }
  }, [household?.id]);

  async function saveProfile() {
    if (!me || !firstName.trim()) return;
    setSavingProfile(true);
    const { error } = await supabase.from("members").update({ first_name: firstName.trim() }).eq("id", me.id);
    setSavingProfile(false);
    if (error) {
      showFeedback("error", t("settings_error_save"));
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
      showFeedback("error", t("settings_error_save"));
      return;
    }
    refresh();
  }

  async function chooseLanguage(lang: Lang) {
    if (!me) return;
    await supabase.from("members").update({ language: lang }).eq("id", me.id);
    refresh();
  }

  async function shareApp() {
    const shareData = {
      title: "Dabo",
      text: t("share_app_message"),
      url: "https://dabo-app.vercel.app",
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Partage annulé par la personne — rien à faire.
      }
    } else {
      navigator.clipboard?.writeText(`${shareData.text} ${shareData.url}`);
      showFeedback("success", t("share_app_copied"));
    }
  }

  useEffect(() => {
    (async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNotifStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNotifStatus("blocked");
        return;
      }
      if (Notification.permission !== "granted") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNotifStatus("idle");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const existingSubscription = await registration?.pushManager.getSubscription();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifStatus(existingSubscription ? "done" : "idle");
    })();
  }, []);

  async function handleEnableNotifications() {
    if (!me) return;
    setNotifStatus("loading");
    setNotifError("");
    try {
      await enableNotifications(supabase, me.id);
      setNotifStatus("done");
    } catch {
      if ("Notification" in window && Notification.permission === "denied") {
        setNotifStatus("blocked");
        return;
      }
      setNotifError(t("settings_notifications_error"));
      setNotifStatus("error");
    }
  }

  async function handleDisableNotifications() {
    setNotifStatus("loading");
    setNotifError("");
    try {
      await disableNotifications(supabase);
      setNotifStatus("idle");
    } catch {
      setNotifError(t("settings_notifications_error"));
      setNotifStatus("error");
    }
  }

  async function toggleEquity() {
    if (!household) return;
    await supabase.from("households").update({ equity_score_enabled: !household.equity_score_enabled }).eq("id", household.id);
    refresh();
  }
  async function toggleDarkMode() {
    if (!me) return;
    await supabase.from("members").update({ dark_mode: !me.dark_mode }).eq("id", me.id);
    refresh();
  }
  async function saveHouseholdType() {
    if (!household) return;
    await supabase.from("households").update({ household_type: householdType }).eq("id", household.id);
    setEditingHouseholdType(false);
    refresh();
  }
  async function saveHouseholdName() {
    if (!household || !householdName.trim()) return;
    setSavingHouseholdName(true);
    await supabase.from("households").update({ name: householdName.trim() }).eq("id", household.id);
    setSavingHouseholdName(false);
    setHouseholdNameSaved(true);
    setEditingHouseholdName(false);
    setTimeout(() => setHouseholdNameSaved(false), 1500);
    refresh();
  }
  function copyCode() {
    if (!household) return;
    navigator.clipboard?.writeText(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function shareInvite() {
    if (!household) return;
    const text = t("settings_invite_share_message")
      .replace("{household}", household.name)
      .replace("{code}", household.invite_code);
    if (navigator.share) {
      try {
        await navigator.share({ title: "DABO", text });
      } catch {
        // Partage annulé — rien à faire.
      }
      return;
    }
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function removeMember(memberId: string) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      showFeedback("error", t("settings_error_session"));
      return false;
    }
    const res = await fetch("/api/remove-member", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) {
      showFeedback("error", t("settings_error_remove_member"));
      return false;
    }
    await refresh();
    showFeedback("success", t("settings_member_removed"));
    return true;
  }

  async function promoteToCreator(memberId: string) {
    const { error } = await supabase.from("members").update({ role: "creator" }).eq("id", memberId);
    if (error) {
      showFeedback("error", t("settings_error_promote"));
      return false;
    }
    await refresh();
    showFeedback("success", t("settings_creator_updated"));
    return true;
  }

  async function leaveHousehold() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      showFeedback("error", t("settings_error_session"));
      return false;
    }
    const res = await fetch("/api/leave-household", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    if (!res.ok) {
      showFeedback("error", t("settings_error_leave"));
      return false;
    }
    router.replace("/");
    return true;
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  async function deleteAccount() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      showFeedback("error", t("settings_error_session"));
      return false;
    }
    const res = await fetch("/api/delete-account", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    if (!res.ok) {
      showFeedback("error", t("settings_error_delete_account"));
      return false;
    }
    await supabase.auth.signOut();
    router.replace("/");
    return true;
  }

  async function confirmSensitiveAction() {
    if (!confirmation) return;
    setConfirmationLoading(true);
    let completed = false;
    if (confirmation.kind === "promote") completed = await promoteToCreator(confirmation.memberId);
    if (confirmation.kind === "remove") completed = await removeMember(confirmation.memberId);
    if (confirmation.kind === "leave") completed = await leaveHousehold();
    if (confirmation.kind === "delete") completed = await deleteAccount();
    setConfirmationLoading(false);
    if (completed) {
      setConfirmation(null);
      setDeletePhrase("");
    }
  }

  if (loading || !household || !me) return <LoadingState />;

  const LANGUAGES: { code: Lang; label: string }[] = [
    { code: "fr", label: "Français" },
    { code: "nl", label: "Nederlands" },
    { code: "en", label: "English" },
  ];

  const householdTypeLabel = household.household_type === "couple"
    ? t("household_couple")
    : household.household_type === "coloc"
      ? t("household_coloc")
      : t("household_famille");

  return (
    <div>
      <Header title={t("settings_title")} />
      <IntroTip id="settings" text={t("intro_settings")} />

      <div className="px-5 pb-8 space-y-7">
        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-ink">{t("settings_my_profile")}</h2>
            <p className="text-xs text-muted mt-0.5">{t("settings_profile_desc")}</p>
          </div>
          <div className="bg-white2 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar member={me} members={members} size={42} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink truncate">{me.first_name}</div>
                <div className="text-xs text-muted">{t("settings_member")}</div>
              </div>
            </div>
            <div className="text-xs font-medium text-ink mb-1.5">{t("settings_first_name")}</div>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink mb-3 bg-white2 text-ink"
            />
            <div className="text-xs text-muted mb-2">{t("settings_avatar_color")}</div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {MEMBER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => chooseColor(c)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: c }}
                  aria-label={t("settings_avatar_color")}
                >
                  {me.avatar_color === c && <Check size={14} color="#F0EFE6" />}
                </button>
              ))}
            </div>
            <div className="text-xs text-muted mb-2">{t("settings_language")}</div>
            <div className="flex gap-2 mb-4 flex-wrap">
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
              {savingProfile ? "..." : profileSaved ? t("saved") : t("save")}
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-ink">{t("settings_section_household")}</h2>
            <p className="text-xs text-muted mt-0.5">{t("settings_household_desc")}</p>
          </div>

          <div className="bg-white2 rounded-2xl p-4 mb-3">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div className="text-base font-semibold text-ink truncate">{household.name}</div>
                <div className="text-xs text-muted mt-0.5">{householdTypeLabel} · {members.length} {members.length === 1 ? t("settings_member_singular") : t("settings_member_plural")}</div>
              </div>
              <span className="text-xl" aria-hidden="true">🏡</span>
            </div>

            <div className="py-3 border-t border-border">
              {!editingHouseholdName ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted">{t("settings_household_name")}</div>
                    <div className="text-sm text-ink font-medium truncate mt-0.5">{household.name}</div>
                  </div>
                  <button onClick={() => { setHouseholdName(household.name); setEditingHouseholdName(true); }} className="flex items-center gap-1.5 text-xs text-muted shrink-0">
                    <Pencil size={13} /> {t("settings_edit")}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-medium text-ink mb-1.5">{t("settings_household_name")}</div>
                  <input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink mb-2 bg-white2 text-ink" autoFocus />
                  <div className="flex gap-2">
                    <button onClick={saveHouseholdName} disabled={savingHouseholdName || !householdName.trim()} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">{savingHouseholdName ? "..." : householdNameSaved ? t("saved") : t("save")}</button>
                    <button onClick={() => { setHouseholdName(household.name); setEditingHouseholdName(false); }} className="px-3 py-2 text-sm text-muted">{t("cancel")}</button>
                  </div>
                </div>
              )}
            </div>

            <div className="py-3 border-t border-border">
              {!editingHouseholdType ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted">{t("settings_household_type")}</div>
                    <div className="text-sm text-ink font-medium mt-0.5">{householdTypeLabel}</div>
                  </div>
                  <button onClick={() => { setHouseholdType(household.household_type); setEditingHouseholdType(true); }} className="flex items-center gap-1.5 text-xs text-muted shrink-0">
                    <Pencil size={13} /> {t("settings_edit")}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-medium text-ink mb-1.5">{t("settings_household_type")}</div>
                  <select value={householdType} onChange={(e) => setHouseholdType(e.target.value as "couple" | "coloc" | "famille")} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink mb-2">
                    <option value="couple">{t("household_couple")}</option>
                    <option value="coloc">{t("household_coloc")}</option>
                    <option value="famille">{t("household_famille")}</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={saveHouseholdType} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium">{t("save")}</button>
                    <button onClick={() => { setHouseholdType(household.household_type); setEditingHouseholdType(false); }} className="px-3 py-2 text-sm text-muted">{t("cancel")}</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white2 rounded-2xl p-4 mb-3">
            <div className="text-sm text-ink font-medium mb-1">{t("settings_invite_member")}</div>
            <p className="text-xs text-muted mb-3">{t("settings_invite_desc")}</p>
            <div className="flex items-center justify-between bg-paper rounded-xl px-3 py-2 mb-3">
              <span className="font-mono text-sm text-ink tracking-wider">{household.invite_code}</span>
              <button onClick={copyCode} className="flex items-center gap-1 text-xs text-muted">
                <Copy size={14} /> {copied ? t("copied") : t("copy")}
              </button>
            </div>
            <button onClick={shareInvite} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-ink font-medium flex items-center justify-center gap-2">
              <Share2 size={15} /> {t("settings_share_invite")}
            </button>
          </div>

          <div className="bg-white2 rounded-2xl p-4">
            <div className="text-sm font-medium text-ink mb-3">{t("settings_members")}</div>
            <div className="space-y-1">
              {members.map((m) => {
                const canManage = me.role === "creator" && m.id !== me.id;
                const actionsOpen = memberActionsId === m.id;
                return (
                  <div key={m.id} className="border-b border-border last:border-b-0 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar member={m} members={members} size={32} />
                        <div className="min-w-0">
                          <div className="text-sm text-ink font-medium truncate">{m.first_name}{m.id === me.id ? ` · ${t("settings_you")}` : ""}</div>
                          <div className="text-xs text-muted">{m.role === "creator" ? t("settings_household_creator") : t("settings_member")}</div>
                        </div>
                      </div>
                      {canManage && (
                        <button onClick={() => setMemberActionsId(actionsOpen ? null : m.id)} className="p-2 text-muted rounded-lg" aria-label={t("settings_member_actions")}>
                          <MoreHorizontal size={18} />
                        </button>
                      )}
                    </div>
                    {canManage && actionsOpen && (
                      <div className="mt-3 ml-10 rounded-xl bg-paper p-2 space-y-1">
                        {m.role !== "creator" && (
                          <button onClick={() => { setMemberActionsId(null); setConfirmation({ kind: "promote", memberId: m.id, name: m.first_name }); }} className="w-full px-2.5 py-2 text-sm text-ink text-left flex items-center gap-2 rounded-lg">
                            <ShieldPlus size={15} className="text-muted" /> {t("promote_creator")}
                          </button>
                        )}
                        <button onClick={() => { setMemberActionsId(null); setConfirmation({ kind: "remove", memberId: m.id, name: m.first_name }); }} className="w-full px-2.5 py-2 text-sm text-red-700/80 text-left flex items-center gap-2 rounded-lg">
                          <UserMinus size={15} /> {t("settings_remove_member")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-ink">{t("settings_section_preferences")}</h2>
            <p className="text-xs text-muted mt-0.5">{t("settings_preferences_desc")}</p>
          </div>
          <div className="space-y-3">
            <div className="bg-white2 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-ink font-medium">{t("settings_dark_mode")}</div>
                <div className="text-xs text-muted">{t("settings_dark_mode_desc")}</div>
              </div>
              <button onClick={toggleDarkMode} className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${me.dark_mode ? "bg-ink" : "bg-border"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-paper rounded-full transition-all ${me.dark_mode ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
            <div className="bg-white2 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-ink font-medium">{t("settings_equity_toggle")}</div>
                <div className="text-xs text-muted">{t("settings_equity_toggle_desc")}</div>
              </div>
              <button onClick={toggleEquity} className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${household.equity_score_enabled ? "bg-ink" : "bg-border"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-paper rounded-full transition-all ${household.equity_score_enabled ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
            <div className="bg-white2 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-ink font-medium flex items-center gap-2 mb-1"><Bell size={15} /> {t("settings_notifications")}</div>
                  <p className="text-xs text-muted">
                    {notifStatus === "checking" ? t("settings_notifications_checking") :
                      notifStatus === "done" ? t("settings_notifications_done") :
                      notifStatus === "blocked" ? t("settings_notifications_blocked") :
                      notifStatus === "unsupported" ? t("settings_notifications_unsupported") :
                      t("settings_notifications_desc")}
                  </p>
                </div>
                {notifStatus === "done" && (
                  <span className="text-[11px] font-medium text-ink bg-paper border border-border rounded-full px-2.5 py-1 shrink-0">
                    {t("settings_notifications_active")}
                  </span>
                )}
              </div>
              {(notifStatus === "idle" || notifStatus === "error" || notifStatus === "loading") && (
                <button onClick={handleEnableNotifications} disabled={notifStatus === "loading"} className="mt-3 bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {notifStatus === "loading" ? "..." : t("settings_notifications_enable")}
                </button>
              )}
              {notifStatus === "done" && (
                <button onClick={handleDisableNotifications} className="mt-3 text-xs text-muted underline">
                  {t("settings_notifications_disable")}
                </button>
              )}
              {notifStatus === "error" && notifError && <p className="text-xs text-red-700 mt-2">{notifError}</p>}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-ink">DABO</h2>
          </div>
          <div className="bg-white2 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-ink font-medium">{t("share_app_title")}</div>
              <div className="text-xs text-muted">{t("share_app_desc")}</div>
            </div>
            <button onClick={shareApp} className="bg-ink text-paper rounded-xl p-2.5 shrink-0" aria-label={t("share_app_title")}>
              <Share2 size={16} />
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-ink">{t("settings_section_account")}</h2>
          </div>
          <div className="bg-white2 rounded-2xl p-4">
            <button onClick={signOut} className="w-full text-sm text-ink py-1 flex items-center justify-between">
              <span>{t("settings_signout")}</span><LogOut size={16} className="text-muted" />
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-red-700/80">{t("settings_sensitive_actions")}</h2>
            <p className="text-xs text-muted mt-0.5">{t("settings_sensitive_actions_desc")}</p>
          </div>
          <div className="border border-border rounded-2xl p-4 space-y-1">
            <button onClick={() => setConfirmation({ kind: "leave" })} className="w-full py-2.5 text-sm text-muted text-left">
              {t("settings_leave")}
            </button>
            <div className="h-px bg-border" />
            <button onClick={() => setConfirmation({ kind: "delete" })} className="w-full py-2.5 text-sm text-red-700/80 text-left">
              {t("settings_delete_account")}
            </button>
          </div>
        </section>
      </div>

      {feedback && (
        <div className="fixed left-4 right-4 bottom-24 z-50 flex justify-center pointer-events-none">
          <div className={`max-w-sm w-full rounded-2xl border px-4 py-3 text-sm shadow-lg ${feedback.type === "error" ? "border-red-200 bg-paper text-red-700" : "border-border bg-paper text-ink"}`}>
            {feedback.text}
          </div>
        </div>
      )}

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 px-0 sm:px-4" onClick={closeConfirmation}>
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-paper p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5 sm:hidden" />
            <h3 className="text-lg font-semibold text-ink">
              {confirmation.kind === "promote" && t("settings_confirm_promote_title").replace("{name}", confirmation.name)}
              {confirmation.kind === "remove" && t("settings_confirm_remove_title").replace("{name}", confirmation.name)}
              {confirmation.kind === "leave" && t("settings_confirm_leave_title").replace("{household}", household.name)}
              {confirmation.kind === "delete" && t("settings_confirm_delete_title")}
            </h3>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              {confirmation.kind === "promote" && t("settings_confirm_promote_desc")}
              {confirmation.kind === "remove" && t("settings_confirm_remove_desc").replace("{name}", confirmation.name)}
              {confirmation.kind === "leave" && t("settings_confirm_leave_desc")}
              {confirmation.kind === "delete" && t("settings_confirm_delete_desc")}
            </p>

            {confirmation.kind === "delete" && (
              <div className="mt-5">
                <label className="block text-xs font-medium text-ink mb-1.5">{t("settings_delete_phrase_label")}</label>
                <input
                  value={deletePhrase}
                  onChange={(e) => setDeletePhrase(e.target.value)}
                  placeholder={t("settings_delete_phrase")}
                  autoComplete="off"
                  className="w-full border border-border rounded-xl bg-white2 px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
                />
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button disabled={confirmationLoading} onClick={closeConfirmation} className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50">
                {t("cancel")}
              </button>
              <button
                disabled={confirmationLoading || (confirmation.kind === "delete" && deletePhrase.trim().toUpperCase() !== t("settings_delete_phrase").toUpperCase())}
                onClick={confirmSensitiveAction}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 ${confirmation.kind === "remove" || confirmation.kind === "leave" || confirmation.kind === "delete" ? "bg-red-700 text-white" : "bg-ink text-paper"}`}
              >
                {confirmationLoading ? "…" : confirmation.kind === "promote" ? t("settings_confirm_promote_action") : confirmation.kind === "remove" ? t("settings_confirm_remove_action") : confirmation.kind === "leave" ? t("settings_confirm_leave_action") : t("settings_confirm_delete_action")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

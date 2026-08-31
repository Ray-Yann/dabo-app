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

export default function SettingsPage() {
  const { loading, household, me, members, supabase, refresh } = useHousehold();
  const router = useRouter();
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
    if (!confirm(`Retirer ${name} du foyer ? Ses tâches et courses assignées repasseront en "non assigné". Ses commentaires seront supprimés.`)) return;
    const { error } = await supabase.from("members").delete().eq("id", memberId);
    if (error) {
      alert("Erreur lors du retrait : " + error.message);
      return;
    }
    refresh();
  }

  async function leaveHousehold() {
    if (!me) return;
    if (!confirm("Quitter ce foyer ? Tu pourras rejoindre un autre foyer ensuite.")) return;
    await supabase.from("members").delete().eq("id", me.id);
    router.replace("/");
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading || !household || !me) return <div className="p-8 text-center text-muted">Chargement…</div>;

  return (
    <div>
      <Header title="Réglages" />
      <IntroTip id="settings" text="Invitez des membres, gérez le type de foyer, et personnalisez les préférences ici." />

      <div className="px-5 space-y-3">
        <div className="bg-white2 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-3 flex items-center gap-2">
            <Avatar member={me} members={members} size={20} /> Mon profil
          </div>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink mb-3"
          />
          <div className="text-xs text-muted mb-2">Couleur de l&apos;avatar</div>
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
          <button onClick={saveProfile} disabled={savingProfile || !firstName.trim()} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
            {savingProfile ? "..." : profileSaved ? "Enregistré !" : "Enregistrer"}
          </button>
        </div>

        <div className="bg-white2 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Inviter</div>
          <p className="text-xs text-muted mb-2">Partage ce code pour rejoindre votre foyer.</p>
          <div className="flex items-center justify-between bg-paper rounded-xl px-3 py-2">
            <span className="font-mono text-sm text-ink">{household.invite_code}</span>
            <button onClick={copyCode} className="flex items-center gap-1 text-xs text-muted">
              <Copy size={14} /> {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>

        <div className="bg-white2 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Foyer</div>
          <div className="text-sm text-ink mb-3">{household.name}</div>
          <select
            value={household.household_type}
            onChange={(e) => changeType(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink"
          >
            <option value="couple">Couple</option>
            <option value="coloc">Colocation</option>
            <option value="famille">Famille</option>
          </select>
        </div>

        <div className="bg-white2 rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Membres</div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar member={m} members={members} size={20} />
                  <span className="text-sm text-ink">{m.first_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{m.role === "creator" ? "Créateur" : "Membre"}</span>
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
            <div className="text-sm text-ink font-medium">Afficher le score d&apos;équité</div>
            <div className="text-xs text-muted">Visible par tout le foyer</div>
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
            <div className="text-sm text-ink font-medium flex items-center gap-2"><Bell size={15} /> Notifications</div>
          </div>
          <p className="text-xs text-muted mb-3">
            {notifStatus === "done" ? "Activées sur cet appareil." : "Reçois un signal quand un membre du foyer termine quelque chose. Sur iPhone, installe d'abord Dabo sur l'écran d'accueil pour que ça fonctionne."}
          </p>
          {notifStatus !== "done" && (
            <button onClick={handleEnableNotifications} disabled={notifStatus === "loading"} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
              {notifStatus === "loading" ? "..." : "Activer les notifications"}
            </button>
          )}
          {notifStatus === "error" && <p className="text-xs text-red-700 mt-2">{notifError}</p>}
        </div>

        <button onClick={leaveHousehold} className="w-full border border-border rounded-xl py-3 text-sm text-muted flex items-center justify-center gap-2 mt-4">
          <LogOut size={14} /> Quitter ce foyer
        </button>
        <button onClick={signOut} className="w-full text-sm text-muted py-2">
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { Copy, LogOut } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";

export default function SettingsPage() {
  const { loading, household, me, members, supabase, refresh } = useHousehold();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

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
  async function leaveHousehold() {
    if (!me) return;
    if (!confirm("Quitter ce foyer ? Tu pourras rejoindre un autre foyer ensuite.")) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const res = await fetch("/api/leave-household", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    if (!res.ok) return;
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
                <span className="text-sm text-ink">{m.first_name}</span>
                <span className="text-xs text-muted">{m.role === "creator" ? "Créateur" : "Membre"}</span>
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

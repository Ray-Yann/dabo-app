"use client";

import { useState } from "react";
import { Check, Home, Plus, Users } from "lucide-react";
import { useHousehold } from "@/lib/use-household";
import { genInviteCode } from "@/lib/utils";
import { useT } from "@/lib/language-context";

type Mode = "closed" | "choice" | "create" | "join";

export function HouseholdSwitcher() {
  const { household, me, memberships, switchHousehold, supabase } = useHousehold();
  const t = useT();
  const [mode, setMode] = useState<Mode>("closed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"couple" | "coloc" | "famille">("couple");
  const [code, setCode] = useState("");

  async function activate(householdId: string) {
    if (householdId === household?.id) return;
    setBusy(true);
    await switchHousehold(householdId);
    setBusy(false);
  }

  async function createHousehold() {
    if (!me || !name.trim()) return;
    setBusy(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setError(t("settings_error_session"));
      setBusy(false);
      return;
    }

    const { data: created, error: householdError } = await supabase
      .from("households")
      .insert({ name: name.trim(), invite_code: genInviteCode(), household_type: type })
      .select("*")
      .single();
    if (householdError || !created) {
      setError(t("households_error_create"));
      setBusy(false);
      return;
    }

    const { error: memberError } = await supabase.from("members").insert({
      household_id: created.id,
      user_id: userId,
      first_name: me.first_name,
      role: "creator",
      language: me.language,
      dark_mode: me.dark_mode,
      avatar_color: me.avatar_color,
      avatar_url: me.avatar_url || null,
      avatar_emoji: me.avatar_emoji || null,
      rotation_order: 0,
    });
    if (memberError) {
      setError(t("households_error_create"));
      setBusy(false);
      return;
    }

    setMode("closed");
    await switchHousehold(created.id);
    setBusy(false);
  }

  async function joinHousehold() {
    if (!me || !code.trim()) return;
    setBusy(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setError(t("settings_error_session"));
      setBusy(false);
      return;
    }

    const { data: target } = await supabase
      .from("households")
      .select("id")
      .eq("invite_code", code.trim().toUpperCase())
      .maybeSingle();
    if (!target) {
      setError(t("households_error_code"));
      setBusy(false);
      return;
    }
    if (memberships.some((membership) => membership.household.id === target.id)) {
      setMode("closed");
      await switchHousehold(target.id);
      setBusy(false);
      return;
    }

    const { count } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("household_id", target.id)
      .is("left_at", null)
      .not("user_id", "is", null);
    const { error: memberError } = await supabase.from("members").insert({
      household_id: target.id,
      user_id: userId,
      first_name: me.first_name,
      role: (count || 0) === 0 ? "creator" : "member",
      language: me.language,
      dark_mode: me.dark_mode,
      avatar_color: me.avatar_color,
      avatar_url: me.avatar_url || null,
      avatar_emoji: me.avatar_emoji || null,
      rotation_order: count || 0,
    });
    if (memberError) {
      setError(t("households_error_join"));
      setBusy(false);
      return;
    }

    setMode("closed");
    await switchHousehold(target.id);
    setBusy(false);
  }

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-ink">{t("households_title")}</h2>
        <p className="text-xs text-muted mt-0.5">{t("households_desc")}</p>
      </div>
      <div className="bg-white2 rounded-2xl p-4 space-y-2">
        {memberships.map((membership) => {
          const active = membership.household.id === household?.id;
          return (
            <button
              key={membership.household.id}
              type="button"
              onClick={() => void activate(membership.household.id)}
              disabled={busy || active}
              className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${active ? "border-gold bg-gold/10" : "border-border"}`}
            >
              <span className="w-9 h-9 rounded-full bg-paper flex items-center justify-center text-ink shrink-0"><Home size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink truncate">{membership.household.name}</span>
                <span className="block text-xs text-muted">{membership.member.role === "creator" ? t("settings_household_creator") : t("settings_member")}</span>
              </span>
              {active && <Check size={17} className="text-gold shrink-0" aria-label={t("households_active")} />}
            </button>
          );
        })}

        {mode === "closed" ? (
          <button type="button" onClick={() => setMode("choice")} className="w-full border border-border rounded-xl p-3 text-sm font-medium text-ink flex items-center justify-center gap-2">
            <Plus size={16} /> {t("households_add")}
          </button>
        ) : mode === "choice" ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={() => setMode("create")} className="border border-border rounded-xl p-3 text-xs text-ink flex flex-col items-center gap-2"><Home size={18} />{t("households_create")}</button>
            <button onClick={() => setMode("join")} className="border border-border rounded-xl p-3 text-xs text-ink flex flex-col items-center gap-2"><Users size={18} />{t("households_join")}</button>
            <button onClick={() => setMode("closed")} className="col-span-2 text-xs text-muted py-1">{t("cancel")}</button>
          </div>
        ) : mode === "create" ? (
          <div className="border-t border-border pt-3 space-y-2">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("households_name_placeholder")} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink outline-none focus:border-ink" />
            <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink outline-none focus:border-ink">
              <option value="couple">{t("household_couple")}</option><option value="coloc">{t("household_coloc")}</option><option value="famille">{t("household_famille")}</option>
            </select>
            <div className="flex gap-2"><button onClick={() => void createHousehold()} disabled={busy || !name.trim()} className="flex-1 bg-ink text-paper rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50">{busy ? "…" : t("households_create")}</button><button onClick={() => setMode("choice")} className="px-3 text-sm text-muted">{t("cancel")}</button></div>
          </div>
        ) : (
          <div className="border-t border-border pt-3 space-y-2">
            <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t("households_code_placeholder")} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-mono bg-white2 text-ink outline-none focus:border-ink uppercase" />
            <div className="flex gap-2"><button onClick={() => void joinHousehold()} disabled={busy || !code.trim()} className="flex-1 bg-ink text-paper rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50">{busy ? "…" : t("households_join")}</button><button onClick={() => setMode("choice")} className="px-3 text-sm text-muted">{t("cancel")}</button></div>
          </div>
        )}
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    </section>
  );
}

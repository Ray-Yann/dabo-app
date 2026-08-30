"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { genInviteCode } from "@/lib/utils";
import { CheckSquare, Home as HomeIcon, KeyRound, Eye, EyeOff } from "lucide-react";

type Phase = "loading" | "auth" | "setup";
type AuthMode = "signup" | "login";
type SetupMode = "choice" | "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("loading");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [setupMode, setSetupMode] = useState<SetupMode>("choice");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [householdType, setHouseholdType] = useState<"couple" | "coloc" | "famille">("couple");
  const [inviteCode, setInviteCode] = useState("");

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setPhase("auth");
        return;
      }
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (member) {
        router.replace("/app");
        return;
      }
      setPhase("setup");
    })();
  }, []);

  async function handleAuth() {
    setBusy(true);
    setError("");
    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
    }
    // Après connexion, vérifier si un foyer existe déjà
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (member) {
        router.replace("/app");
        return;
      }
    }
    setPhase("setup");
    setBusy(false);
  }

  async function handleCreateHousehold() {
    setBusy(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError("Session expirée, reconnecte-toi.");
      setBusy(false);
      return;
    }
    const code = genInviteCode();
    const { data: household, error: hErr } = await supabase
      .from("households")
      .insert({ name: householdName || "Notre foyer", invite_code: code, household_type: householdType })
      .select()
      .single();
    if (hErr || !household) {
      setError(hErr?.message || "Erreur lors de la création du foyer.");
      setBusy(false);
      return;
    }
    const { error: mErr } = await supabase.from("members").insert({
      household_id: household.id,
      user_id: sessionData.session.user.id,
      first_name: firstName,
      role: "creator",
      rotation_order: 0,
    });
    if (mErr) {
      setError(mErr.message);
      setBusy(false);
      return;
    }
    router.replace("/app");
  }

  async function handleJoinHousehold() {
    setBusy(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError("Session expirée, reconnecte-toi.");
      setBusy(false);
      return;
    }
    const { data: household, error: hErr } = await supabase
      .from("households")
      .select("id")
      .eq("invite_code", inviteCode.trim().toUpperCase())
      .maybeSingle();
    if (hErr || !household) {
      setError("Code introuvable. Vérifie et réessaie.");
      setBusy(false);
      return;
    }
    const { count } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("household_id", household.id);

    const { error: mErr } = await supabase.from("members").insert({
      household_id: household.id,
      user_id: sessionData.session.user.id,
      first_name: firstName,
      role: "member",
      rotation_order: count || 0,
    });
    if (mErr) {
      setError(mErr.message);
      setBusy(false);
      return;
    }
    router.replace("/app");
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E7E3D8]">
        <div className="text-ink">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#E7E3D8] px-6 py-12">
      <div className="w-full max-w-sm bg-paper rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ink flex items-center justify-center mx-auto mb-6">
          <CheckSquare size={28} color="#F0EFE6" strokeWidth={2} />
        </div>

        {phase === "auth" && (
          <>
            <h1 className="font-serif text-2xl text-ink mb-1">Bienvenue sur Dabo</h1>
            <p className="text-sm text-muted mb-6">L&apos;équilibre du foyer, enfin visible.</p>

            <div className="space-y-3 text-left">
              <input
                type="email"
                placeholder="Ton email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 focus:border-ink outline-none"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 pr-11 text-sm bg-white2 focus:border-ink outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-700 mt-3">{error}</p>}

            <button
              disabled={!email || !password || busy}
              onClick={handleAuth}
              className="w-full bg-ink text-paper rounded-xl py-3 mt-4 font-medium disabled:opacity-50"
            >
              {busy ? "..." : authMode === "signup" ? "Créer mon compte" : "Se connecter"}
            </button>

            <button
              className="text-sm text-muted mt-4"
              onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}
            >
              {authMode === "signup" ? "J'ai déjà un compte" : "Créer un compte"}
            </button>
          </>
        )}

        {phase === "setup" && setupMode === "choice" && (
          <>
            <h1 className="font-serif text-2xl text-ink mb-1">Ton foyer</h1>
            <p className="text-sm text-muted mb-6">Crée ton foyer ou rejoins celui d&apos;un proche.</p>
            <button
              onClick={() => setSetupMode("create")}
              className="w-full flex items-center gap-3 border border-border rounded-xl p-4 mb-3 text-left hover:border-ink"
            >
              <HomeIcon size={20} className="text-ink" />
              <div>
                <div className="font-medium text-ink text-sm">Créer un foyer</div>
                <div className="text-xs text-muted">Démarrer un nouvel espace partagé</div>
              </div>
            </button>
            <button
              onClick={() => setSetupMode("join")}
              className="w-full flex items-center gap-3 border border-border rounded-xl p-4 text-left hover:border-ink"
            >
              <KeyRound size={20} className="text-ink" />
              <div>
                <div className="font-medium text-ink text-sm">Rejoindre un foyer</div>
                <div className="text-xs text-muted">Utiliser un code d&apos;invitation</div>
              </div>
            </button>
          </>
        )}

        {phase === "setup" && setupMode === "create" && (
          <>
            <h1 className="font-serif text-xl text-ink mb-4">Créer ton foyer</h1>
            <div className="space-y-3 text-left">
              <input
                placeholder="Ton prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 outline-none focus:border-ink"
              />
              <input
                placeholder="Nom du foyer (ex. Chez nous)"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 outline-none focus:border-ink"
              />
              <select
                value={householdType}
                onChange={(e) => setHouseholdType(e.target.value as "couple" | "coloc" | "famille")}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 outline-none focus:border-ink"
              >
                <option value="couple">Couple</option>
                <option value="coloc">Colocation</option>
                <option value="famille">Famille</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
            <button
              disabled={!firstName || busy}
              onClick={handleCreateHousehold}
              className="w-full bg-ink text-paper rounded-xl py-3 mt-4 font-medium disabled:opacity-50"
            >
              {busy ? "..." : "Créer"}
            </button>
            <button className="text-sm text-muted mt-4" onClick={() => setSetupMode("choice")}>
              Retour
            </button>
          </>
        )}

        {phase === "setup" && setupMode === "join" && (
          <>
            <h1 className="font-serif text-xl text-ink mb-4">Rejoindre un foyer</h1>
            <div className="space-y-3 text-left">
              <input
                placeholder="Code du foyer (ex. ABC-482)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 outline-none focus:border-ink"
              />
              <input
                placeholder="Ton prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 outline-none focus:border-ink"
              />
            </div>
            {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
            <button
              disabled={!inviteCode || !firstName || busy}
              onClick={handleJoinHousehold}
              className="w-full bg-ink text-paper rounded-xl py-3 mt-4 font-medium disabled:opacity-50"
            >
              {busy ? "..." : "Rejoindre"}
            </button>
            <button className="text-sm text-muted mt-4" onClick={() => setSetupMode("choice")}>
              Retour
            </button>
          </>
        )}
      </div>
    </div>
  );
}

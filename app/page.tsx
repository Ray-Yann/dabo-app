"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LoadingState } from "@/components/LoadingState";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { createClient as createRecoveryClient } from "@supabase/supabase-js";
import { genInviteCode } from "@/lib/utils";
import { CheckSquare, Home as HomeIcon, KeyRound, Eye, EyeOff, Share2 } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { AVAILABLE_LANGUAGE_OPTIONS, detectAvailableLanguageFromDevice, isAvailableLang } from "@/lib/languages";
import { captureReferralFromUrl, trackAcquisitionEvent } from "@/lib/acquisition";

type Phase = "loading" | "auth" | "setup";
type AuthMode = "signup" | "login" | "forgot";
type SetupMode = "choice" | "create" | "join" | "created";
type CreatedHousehold = { id: string; name: string; invite_code: string };

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
  const [memberLang, setMemberLang] = useState<Lang>("fr");

  // Cet écran (avant connexion) ne doit jamais s'afficher en mode sombre —
  // cette préférence appartient à un profil qui n'existe pas encore ici.
  // Filet de sécurité au cas où la classe serait restée d'une session précédente.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    captureReferralFromUrl();
    const incomingInvite = new URLSearchParams(window.location.search).get("invite")?.trim().toUpperCase();
    if (incomingInvite) {
      setInviteCode(incomingInvite);
      setInviteFromLink(true);
      setSetupMode("join");
    }
    void trackAcquisitionEvent("landing_view");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMemberLang(detectAvailableLanguageFromDevice());
  }, []);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteFromLink, setInviteFromLink] = useState(false);
  const [createdHousehold, setCreatedHousehold] = useState<CreatedHousehold | null>(null);
  const [inviteShared, setInviteShared] = useState(false);

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleForgotPassword() {
    setBusy(true);
    setError("");
    // Le lien de récupération peut être ouvert depuis Gmail dans Safari,
    // donc il ne doit pas dépendre du verifier PKCE stocké dans le navigateur
    // qui a demandé la réinitialisation. On utilise le flux implicite uniquement
    // pour cette demande de récupération.
    const recoveryClient = createRecoveryClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: "implicit",
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { error } = await recoveryClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForgotSent(true);
  }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setPhase("auth");
        return;
      }
      const { data: members } = await supabase
        .from("members")
        .select("id,first_name")
        .eq("user_id", data.session.user.id)
        .is("left_at", null)
        .limit(1);
      const incomingInvite = new URLSearchParams(window.location.search).get("invite")?.trim().toUpperCase();
      if (members && members.length > 0 && !incomingInvite) {
        router.replace("/app");
        return;
      }
      if (members?.[0]?.first_name) setFirstName(members[0].first_name);
      if (incomingInvite) {
        setInviteCode(incomingInvite);
        setInviteFromLink(true);
        setSetupMode("join");
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
      await trackAcquisitionEvent("signup_completed");
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
      const { data: members } = await supabase
        .from("members")
        .select("id,first_name")
        .eq("user_id", data.session.user.id)
        .is("left_at", null)
        .limit(1);
      if (members && members.length > 0 && !inviteFromLink) {
        router.replace("/app");
        return;
      }
      if (members?.[0]?.first_name) setFirstName(members[0].first_name);
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
      language: memberLang,
      rotation_order: 0,
    });
    if (mErr) {
      setError(mErr.message);
      setBusy(false);
      return;
    }
    await trackAcquisitionEvent("household_created", { householdId: household.id });
    setCreatedHousehold({ id: household.id, name: household.name, invite_code: household.invite_code });
    setSetupMode("created");
    setBusy(false);
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
    // Le rôle est attribué côté base avec SECURITY DEFINER : avant d'être membre,
    // les RLS empêchent volontairement l'invité de compter les autres membres.
    // Le faire côté client pouvait donc lui attribuer à tort le rôle creator.
    const { data: joinResult, error: joinErr } = await supabase.rpc("join_household_by_invite", {
      p_invite_code: inviteCode.trim().toUpperCase(),
      p_first_name: firstName.trim(),
      p_language: memberLang,
    });
    if (joinErr || !joinResult?.[0]?.household_id) {
      const message = joinErr?.message || "";
      setError(message.includes("INVITE_NOT_FOUND") ? "Code introuvable. Vérifie et réessaie." : "Impossible de rejoindre ce foyer pour le moment.");
      setBusy(false);
      return;
    }
    await trackAcquisitionEvent("household_joined", { householdId: joinResult[0].household_id });
    router.replace("/app");
  }

  async function shareCreatedHousehold() {
    if (!createdHousehold) return;
    const inviteUrl = `${window.location.origin}/?invite=${encodeURIComponent(createdHousehold.invite_code)}`;
    const text = `Rejoins ${createdHousehold.name} sur DABO.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "DABO", text, url: inviteUrl });
      } else {
        await navigator.clipboard.writeText(`${text} ${inviteUrl}`);
      }
      setInviteShared(true);
      setTimeout(() => setInviteShared(false), 1800);
    } catch {
      // Partage annulé : le code reste visible comme solution de secours.
    }
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E7E3D8]">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#E7E3D8] px-6 py-12">
      <div className="w-full max-w-sm bg-paper rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-6 shadow-sm">
          <Image src="/icon.svg" alt="DABO" width={64} height={64} priority />
        </div>

        {phase === "auth" && authMode !== "forgot" && (
          <>
            <h1 className="font-serif text-2xl text-ink mb-1">{inviteFromLink ? "Tu es invité·e sur DABO" : "Bienvenue sur Dabo"}</h1>
            <p className="text-sm text-muted mb-1">{inviteFromLink ? "Connecte-toi ou crée ton compte pour rejoindre le foyer." : "L’équilibre du foyer, enfin visible."}</p>
            <p className="text-xs text-muted mb-6">{inviteFromLink ? `Invitation ${inviteCode} prête à être utilisée.` : "Crée ton compte pour retrouver ton foyer, où que tu sois — tes proches t’y attendent déjà, ou t’y rejoindront bientôt."}</p>

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

            {authMode === "login" && (
              <button className="text-sm text-muted mt-2 block mx-auto" onClick={() => { setAuthMode("forgot"); setError(""); setForgotSent(false); }}>
                Mot de passe oublié ?
              </button>
            )}
          </>
        )}

        {phase === "auth" && authMode === "forgot" && (
          <>
            <h1 className="font-serif text-2xl text-ink mb-1">Mot de passe oublié</h1>
            {!forgotSent ? (
              <>
                <p className="text-sm text-muted mb-6">On t&apos;envoie un lien pour en choisir un nouveau.</p>
                <input
                  type="email"
                  placeholder="Ton email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 focus:border-ink outline-none"
                />
                {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
                <button
                  disabled={!email || busy}
                  onClick={handleForgotPassword}
                  className="w-full bg-ink text-paper rounded-xl py-3 mt-4 font-medium disabled:opacity-50"
                >
                  {busy ? "..." : "Envoyer le lien"}
                </button>
              </>
            ) : (
              <p className="text-sm text-muted mb-2">Vérifie tes emails (et tes spams) — un lien vient de t&apos;être envoyé.</p>
            )}
            <button className="text-sm text-muted mt-4" onClick={() => setAuthMode("login")}>
              Retour
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
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 text-ink outline-none focus:border-ink"
              />
              <input
                placeholder="Nom du foyer (ex. Chez nous)"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 text-ink outline-none focus:border-ink"
              />
              <select
                value={householdType}
                onChange={(e) => setHouseholdType(e.target.value as "couple" | "coloc" | "famille")}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 text-ink outline-none focus:border-ink"
              >
                <option value="couple">Couple</option>
                <option value="coloc">Colocation</option>
                <option value="famille">Famille</option>
              </select>
              <select
                aria-label="Langue de DABO"
                value={memberLang}
                onChange={(event) => { if (isAvailableLang(event.target.value)) setMemberLang(event.target.value); }}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 text-ink outline-none focus:border-ink"
              >
                {AVAILABLE_LANGUAGE_OPTIONS.map((language) => (
                  <option key={language.code} value={language.code}>{language.nativeLabel}</option>
                ))}
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

        {phase === "setup" && setupMode === "created" && createdHousehold && (
          <>
            <div className="w-12 h-12 rounded-full bg-mustardBg flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={22} className="text-ink" />
            </div>
            <h1 className="font-serif text-2xl text-ink mb-1">Ton foyer est prêt 🎉</h1>
            <p className="text-sm text-muted mb-5">Invite maintenant les personnes avec qui tu veux organiser le quotidien.</p>
            <div className="rounded-xl border border-border bg-white2 px-4 py-3 mb-3">
              <div className="text-xs text-muted mb-1">Code d’invitation</div>
              <div className="font-mono font-medium tracking-wider text-ink">{createdHousehold.invite_code}</div>
            </div>
            <button onClick={() => void shareCreatedHousehold()} className="w-full bg-ink text-paper rounded-xl py-3 font-medium flex items-center justify-center gap-2">
              <Share2 size={17} /> {inviteShared ? "Invitation prête ✓" : "Partager l’invitation"}
            </button>
            <button className="text-sm text-muted mt-4" onClick={() => router.replace("/app")}>Plus tard</button>
          </>
        )}

        {phase === "setup" && setupMode === "join" && (
          <>
            <h1 className="font-serif text-xl text-ink mb-1">{inviteFromLink ? "Ton invitation est prête" : "Rejoindre un foyer"}</h1>
            {inviteFromLink && <p className="text-sm text-muted mb-4">Il ne reste qu’à confirmer ton prénom pour rejoindre le foyer.</p>}
            <div className="space-y-3 text-left">
              <input
                placeholder="Code du foyer (ex. ABC-482)"
                value={inviteCode}
                readOnly={inviteFromLink}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 text-ink outline-none focus:border-ink"
              />
              <input
                placeholder="Ton prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 text-ink outline-none focus:border-ink"
              />
              <select
                aria-label="Langue de DABO"
                value={memberLang}
                onChange={(event) => { if (isAvailableLang(event.target.value)) setMemberLang(event.target.value); }}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white2 text-ink outline-none focus:border-ink"
              >
                {AVAILABLE_LANGUAGE_OPTIONS.map((language) => (
                  <option key={language.code} value={language.code}>{language.nativeLabel}</option>
                ))}
              </select>
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

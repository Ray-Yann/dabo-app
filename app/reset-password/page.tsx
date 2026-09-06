"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { CheckSquare, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const markRecoveryReady = () => {
      if (cancelled) return;
      setRecoveryReady(true);
      setCheckingRecovery(false);
      setError("");
    };

    const markRecoveryError = () => {
      if (cancelled) return;
      setRecoveryReady(false);
      setCheckingRecovery(false);
      setError(
        "Ce lien de réinitialisation est invalide ou a expiré. Demande un nouveau lien depuis DABO."
      );
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          markRecoveryReady();
        }
      }
    );

    async function prepareRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // @supabase/ssr utilise PKCE par défaut : le lien de récupération
        // revient avec un code qu'il faut échanger contre une session.
        if (code) {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError || !data.session) {
            markRecoveryError();
            return;
          }

          window.history.replaceState({}, "", "/reset-password");
          markRecoveryReady();
          return;
        }

        // Filet de sécurité pour un éventuel lien en flux implicite.
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError || !data.session) {
            markRecoveryError();
            return;
          }

          window.history.replaceState({}, "", "/reset-password");
          markRecoveryReady();
          return;
        }

        // Si Supabase a déjà restauré la session dans le navigateur,
        // on l'accepte sans demander un second échange.
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session) {
          markRecoveryError();
          return;
        }

        markRecoveryReady();
      } catch {
        markRecoveryError();
      }
    }

    prepareRecoverySession();

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit() {
    if (!recoveryReady || password.length < 6) return;

    setBusy(true);
    setError("");

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      setBusy(false);
      setRecoveryReady(false);
      setError(
        "La session de réinitialisation a expiré. Demande un nouveau lien depuis DABO."
      );
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(
        updateError.message === "Auth session missing!"
          ? "La session de réinitialisation a expiré. Demande un nouveau lien depuis DABO."
          : updateError.message
      );
      return;
    }

    setDone(true);
    setTimeout(() => router.replace("/app"), 1500);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#E7E3D8] px-6 py-12">
      <div className="w-full max-w-sm bg-paper rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ink flex items-center justify-center mx-auto mb-6">
          <CheckSquare size={28} color="#F0EFE6" strokeWidth={2} />
        </div>

        {!done ? (
          <>
            <h1 className="font-serif text-2xl text-ink mb-1">
              Nouveau mot de passe
            </h1>
            <p className="text-sm text-muted mb-6">
              Choisis un mot de passe pour ton compte Dabo.
            </p>

            <div className="relative text-left">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={checkingRecovery || !recoveryReady}
                className="w-full border border-border rounded-xl px-4 py-3 pr-11 text-sm bg-white2 focus:border-ink outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={checkingRecovery || !recoveryReady}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted disabled:opacity-50"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {checkingRecovery && (
              <p className="text-sm text-muted mt-3">
                Vérification du lien de réinitialisation…
              </p>
            )}

            {error && <p className="text-sm text-red-700 mt-3">{error}</p>}

            <button
              disabled={
                checkingRecovery ||
                !recoveryReady ||
                !password ||
                password.length < 6 ||
                busy
              }
              onClick={handleSubmit}
              className="w-full bg-ink text-paper rounded-xl py-3 mt-4 font-medium disabled:opacity-50"
            >
              {busy ? "..." : "Enregistrer"}
            </button>
          </>
        ) : (
          <p className="text-sm text-ink">
            Mot de passe mis à jour. Direction ton tableau de bord…
          </p>
        )}
      </div>
    </div>
  );
}

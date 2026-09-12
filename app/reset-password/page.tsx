"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as createRecoveryClient } from "@supabase/supabase-js";
import { CheckSquare, Eye, EyeOff } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n";
import { detectAvailableLanguageFromDevice } from "@/lib/languages";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createRecoveryClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            flowType: "implicit",
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: true,
          },
        }
      ),
    []
  );

  const [lang, setLang] = useState<Lang>("fr");
  const t = (key: string) => translate(lang, key);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    setLang(detectAvailableLanguageFromDevice());
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
        t("reset_invalid")
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
        // R4.2 : la récupération utilise un client Auth isolé en flux implicite.
        // Le lien doit donc transporter la session dans le fragment (#...).
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

        // detectSessionInUrl peut avoir restauré la session automatiquement
        // avant l'exécution de ce code.
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
  }, [supabase, lang]);

  async function handleSubmit() {
    if (!recoveryReady || password.length < 6) return;

    setBusy(true);
    setError("");

    // getSession() confirme l'état local, puis getUser() vérifie réellement
    // la session auprès de Supabase avant toute modification sensible.
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      setBusy(false);
      setRecoveryReady(false);
      setError(t("reset_expired"));
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setBusy(false);
      setRecoveryReady(false);
      setError(t("reset_expired"));
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      // Ne jamais afficher le message brut du fournisseur : on exploite le code
      // Auth stable pour donner une action utile dans les 7 langues DABO.
      const code = updateError.code ?? "";
      console.warn("[DABO password recovery] update failed", {
        code,
        status: updateError.status,
      });

      if (code === "same_password") {
        setError(t("reset_same_password"));
      } else if (code === "weak_password") {
        setError(t("reset_weak_password"));
      } else if (
        code === "session_not_found" ||
        code === "refresh_token_not_found" ||
        code === "refresh_token_already_used" ||
        updateError.message === "Auth session missing!"
      ) {
        setRecoveryReady(false);
        setError(t("reset_expired"));
      } else {
        setError(t("reset_update_failed"));
      }
      return;
    }

    // Une session de récupération ne devient pas la session permanente de
    // l'utilisateur : après le changement, on revient à la connexion.
    await supabase.auth.signOut();
    setDone(true);
    setTimeout(() => router.replace("/"), 1500);
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
              {t("reset_title")}
            </h1>
            <p className="text-sm text-muted mb-6">
              {t("reset_body")}
            </p>

            <div className="relative text-left">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("reset_placeholder")}
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
                aria-label={showPassword ? t("reset_hide_password") : t("reset_show_password")}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {checkingRecovery && (
              <p className="text-sm text-muted mt-3">
                {t("reset_checking")}
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
              {busy ? "..." : t("reset_save")}
            </button>
          </>
        ) : (
          <p className="text-sm text-ink">
            {t("reset_done")}
          </p>
        )}
      </div>
    </div>
  );
}

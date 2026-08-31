"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { CheckSquare, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
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
            <h1 className="font-serif text-2xl text-ink mb-1">Nouveau mot de passe</h1>
            <p className="text-sm text-muted mb-6">Choisis un mot de passe pour ton compte Dabo.</p>

            <div className="relative text-left">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 pr-11 text-sm bg-white2 focus:border-ink outline-none"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {error && <p className="text-sm text-red-700 mt-3">{error}</p>}

            <button
              disabled={!password || password.length < 6 || busy}
              onClick={handleSubmit}
              className="w-full bg-ink text-paper rounded-xl py-3 mt-4 font-medium disabled:opacity-50"
            >
              {busy ? "..." : "Enregistrer"}
            </button>
          </>
        ) : (
          <p className="text-sm text-ink">Mot de passe mis à jour. Direction ton tableau de bord…</p>
        )}
      </div>
    </div>
  );
}

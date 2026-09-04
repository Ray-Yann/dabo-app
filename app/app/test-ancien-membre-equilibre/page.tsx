"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";

type Diagnostic = {
  success?: boolean;
  testMemberName?: string;
  stage?: string;
  diagnostic?: string;
  error?: string;
};

export default function FormerMemberHistoryTestPage() {
  const supabase = createClient();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<Diagnostic | null>(null);

  async function runTest() {
    setStatus("running");
    setResult(null);

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setResult({ error: "Session introuvable.", stage: "browser_session" });
      setStatus("error");
      return;
    }

    const response = await fetch("/api/test-former-member-history", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });

    const body = await response.json();
    setResult(body);
    setStatus(response.ok ? "done" : "error");
  }

  return (
    <main className="min-h-screen bg-paper px-5 py-10 text-ink">
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-white2 p-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Diagnostic temporaire DABO
        </p>
        <h1 className="mt-2 font-serif text-2xl">Ancien membre dans Équilibre</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Cette version indique précisément l’étape qui bloque. Ray-Yann et Manga ne sont pas modifiés.
        </p>

        <button
          onClick={runTest}
          disabled={status === "running"}
          className="mt-6 w-full rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-50"
        >
          {status === "running" ? "Diagnostic en cours…" : "Lancer le diagnostic"}
        </button>

        {status === "done" && (
          <div className="mt-6 rounded-2xl border border-border p-4 text-sm">
            <p className="font-medium">✓ Données de test prêtes</p>
            {result?.testMemberName && <p className="mt-2 text-muted">{result.testMemberName}</p>}
          </div>
        )}

        {status === "error" && result && (
          <div className="mt-6 rounded-2xl border border-border p-4 text-sm">
            <p className="font-medium">Diagnostic obtenu</p>
            <p className="mt-3"><strong>Étape :</strong> {result.stage || "inconnue"}</p>
            <p className="mt-2 break-words"><strong>Erreur :</strong> {result.diagnostic || result.error || "inconnue"}</p>
          </div>
        )}
      </div>
    </main>
  );
}

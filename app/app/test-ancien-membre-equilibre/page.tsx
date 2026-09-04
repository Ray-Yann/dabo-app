"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";

type Result = {
  testMemberName?: string;
  alreadyExists?: boolean;
  instructions?: {
    week?: string;
    threeMonths?: string;
  };
};

export default function FormerMemberHistoryTestPage() {
  const supabase = createClient();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function createTest() {
    setStatus("running");
    setResult(null);
    setError("");

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setStatus("error");
      setError("Session introuvable.");
      return;
    }

    const response = await fetch("/api/test-former-member-history", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });

    const body = await response.json();

    if (!response.ok) {
      setStatus("error");
      setError(body.error || "Le test n’a pas pu être préparé.");
      return;
    }

    setResult(body);
    setStatus("done");
  }

  return (
    <main className="min-h-screen bg-paper px-5 py-10 text-ink">
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-white2 p-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Test temporaire DABO
        </p>

        <h1 className="mt-2 font-serif text-2xl">
          Ancien membre dans Équilibre
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          Ce test crée uniquement un faux ancien membre et une contribution historique.
          Ray-Yann et Manga ne sont pas modifiés.
        </p>

        <button
          onClick={createTest}
          disabled={status === "running"}
          className="mt-6 w-full rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-50"
        >
          {status === "running" ? "Préparation du test…" : "Préparer le test historique"}
        </button>

        {status === "done" && (
          <div className="mt-6 space-y-3 rounded-2xl border border-border px-4 py-4 text-sm">
            <p className="font-medium">✓ Données de test prêtes</p>
            {result?.testMemberName && (
              <p className="text-muted">
                Membre temporaire : <span className="text-ink">{result.testMemberName}</span>
              </p>
            )}
            <p>
              <strong>1.</strong> Dans Équilibre → <strong>Semaine</strong> : le membre de test ne doit pas apparaître.
            </p>
            <p>
              <strong>2.</strong> Passe ensuite sur <strong>3 mois</strong> : il doit apparaître avec la mention
              <strong> Ancien membre</strong>.
            </p>
            <p className="text-xs leading-5 text-muted">
              Les données temporaires seront supprimées après la vérification visuelle.
            </p>
          </div>
        )}

        {status === "error" && error && (
          <p className="mt-5 text-sm text-red-700">{error}</p>
        )}
      </div>
    </main>
  );
}

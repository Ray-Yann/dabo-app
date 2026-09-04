"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";

export default function ArchiveMemberTestPage() {
  const supabase = createClient();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<Record<string, boolean> | null>(null);
  const [error, setError] = useState("");

  async function runTest() {
    setStatus("running");
    setResult(null);
    setError("");

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setStatus("error");
      setError("Session introuvable.");
      return;
    }

    const res = await fetch("/api/test-member-archive", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    const body = await res.json();

    if (!res.ok) {
      setStatus("error");
      setError(body.error || "Le test a échoué.");
      return;
    }

    setResult(body.checks || null);
    setStatus(body.success ? "done" : "error");
    if (!body.success) setError("Au moins une vérification a échoué.");
  }

  const labels: Record<string, string> = {
    left_at_enregistre: "Date de départ enregistrée",
    couleur_archivee: "Couleur historique conservée",
    user_id_detache: "Compte utilisateur détaché",
    tache_future_desassignee: "Tâche future désassignée",
    course_future_desassignee: "Course future désassignée",
    exclu_des_membres_actifs: "Ancien membre exclu des usages actifs",
    conserve_dans_historique: "Ancien membre conservé dans l’historique",
  };

  return (
    <main className="min-h-screen bg-paper px-5 py-10 text-ink">
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-white2 p-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Test temporaire DABO</p>
        <h1 className="mt-2 font-serif text-2xl">Archivage d’un membre</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Ce test crée un membre, une tâche et une course temporaires, vérifie l’archivage puis supprime automatiquement toutes les données de test. Ray-Yann et Manga ne sont jamais modifiés.
        </p>

        <button
          onClick={runTest}
          disabled={status === "running"}
          className="mt-6 w-full rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-50"
        >
          {status === "running" ? "Test en cours…" : "Lancer le test contrôlé"}
        </button>

        {result && (
          <div className="mt-6 space-y-2">
            {Object.entries(result).map(([key, ok]) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2 text-sm">
                <span>{labels[key] || key}</span>
                <span className="font-medium">{ok ? "✓" : "✕"}</span>
              </div>
            ))}
          </div>
        )}

        {status === "done" && (
          <p className="mt-5 text-sm font-medium">✓ Test réussi. Les données temporaires ont été nettoyées.</p>
        )}
        {status === "error" && error && <p className="mt-5 text-sm text-red-700">{error}</p>}
      </div>
    </main>
  );
}

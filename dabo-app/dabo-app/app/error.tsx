"use client";

import Image from "next/image";
import { useEffect } from "react";

const COPY = {
  fr: { title: "DABO a rencontré un problème", body: "Vos données ne sont pas perdues. Réessayez pour reprendre là où vous en étiez.", retry: "Réessayer", home: "Retour à l’accueil" },
  nl: { title: "DABO heeft een probleem ondervonden", body: "Je gegevens zijn niet verloren. Probeer opnieuw om verder te gaan waar je was gebleven.", retry: "Opnieuw proberen", home: "Terug naar start" },
  en: { title: "DABO ran into a problem", body: "Your data is not lost. Try again to continue where you left off.", retry: "Try again", home: "Back to home" },
  de: { title: "Bei DABO ist ein Problem aufgetreten", body: "Ihre Daten sind nicht verloren. Versuchen Sie es erneut, um dort weiterzumachen, wo Sie aufgehört haben.", retry: "Erneut versuchen", home: "Zur Startseite" },
  es: { title: "DABO ha encontrado un problema", body: "Tus datos no se han perdido. Inténtalo de nuevo para continuar donde lo dejaste.", retry: "Reintentar", home: "Volver al inicio" },
  it: { title: "DABO ha riscontrato un problema", body: "I tuoi dati non sono andati persi. Riprova per continuare da dove avevi lasciato.", retry: "Riprova", home: "Torna alla home" },
  pt: { title: "O DABO encontrou um problema", body: "Os seus dados não foram perdidos. Tente novamente para continuar de onde parou.", retry: "Tentar novamente", home: "Voltar ao início" },
} as const;

type ErrorLang = keyof typeof COPY;

function browserLang(): ErrorLang {
  if (typeof navigator === "undefined") return "fr";
  const code = navigator.language.toLowerCase().split("-")[0];
  return code in COPY ? (code as ErrorLang) : "fr";
}

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[DABO] application error", error);
  }, [error]);

  const copy = COPY[browserLang()];

  return (
    <main className="min-h-screen bg-paper text-ink flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-line bg-surface p-7 text-center shadow-sm" role="alert">
        <Image src="/icon.svg" alt="DABO" width={64} height={64} className="mx-auto rounded-2xl" priority />
        <h1 className="mt-5 font-serif text-2xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{copy.body}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper">
            {copy.retry}
          </button>
          <a href="/app" className="rounded-2xl border border-line px-5 py-3 text-sm font-semibold text-ink">
            {copy.home}
          </a>
        </div>
      </section>
    </main>
  );
}

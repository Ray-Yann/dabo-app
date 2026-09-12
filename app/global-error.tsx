"use client";

import { useEffect, useState } from "react";
import { translate, type Lang } from "@/lib/i18n";
import { detectAvailableLanguageFromDevice } from "@/lib/languages";

const COPY: Record<Lang, { body: string; retry: string }> = {
  fr: { body: "Un problème inattendu est survenu. Vos données ne sont pas perdues.", retry: "Réessayer" },
  nl: { body: "Er is een onverwacht probleem opgetreden. Je gegevens zijn niet verloren.", retry: "Opnieuw proberen" },
  en: { body: "An unexpected problem occurred. Your data is not lost.", retry: "Try again" },
  de: { body: "Ein unerwartetes Problem ist aufgetreten. Deine Daten sind nicht verloren.", retry: "Erneut versuchen" },
  es: { body: "Se ha producido un problema inesperado. Tus datos no se han perdido.", retry: "Reintentar" },
  it: { body: "Si è verificato un problema imprevisto. I tuoi dati non sono andati persi.", retry: "Riprova" },
  pt: { body: "Ocorreu um problema inesperado. Os teus dados não foram perdidos.", retry: "Tentar novamente" },
};

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [lang, setLang] = useState<Lang>("fr");
  useEffect(() => { setLang(detectAvailableLanguageFromDevice()); }, []);
  const copy = COPY[lang];
  return (
    <html lang={lang}>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F0EFE6", color: "#172719" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "100%", maxWidth: 420, textAlign: "center" }} role="alert">
            <img src="/icon.svg" alt="DABO" width="64" height="64" style={{ borderRadius: 16 }} />
            <h1 style={{ fontSize: 24, margin: "20px 0 8px" }}>DABO</h1>
            <p style={{ lineHeight: 1.6, opacity: 0.72 }}>{copy.body}</p>
            <button type="button" onClick={reset} style={{ marginTop: 16, border: 0, borderRadius: 14, padding: "12px 18px", background: "#172719", color: "#F0EFE6", fontWeight: 700, cursor: "pointer" }}>
              {copy.retry}
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

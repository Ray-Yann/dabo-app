"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F0EFE6", color: "#172719" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "100%", maxWidth: 420, textAlign: "center" }} role="alert">
            <img src="/icon.svg" alt="DABO" width="64" height="64" style={{ borderRadius: 16 }} />
            <h1 style={{ fontSize: 24, margin: "20px 0 8px" }}>DABO</h1>
            <p style={{ lineHeight: 1.6, opacity: 0.72 }}>Un problème inattendu est survenu. Vos données ne sont pas perdues.</p>
            <button type="button" onClick={reset} style={{ marginTop: 16, border: 0, borderRadius: 14, padding: "12px 18px", background: "#172719", color: "#F0EFE6", fontWeight: 700, cursor: "pointer" }}>
              Réessayer
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

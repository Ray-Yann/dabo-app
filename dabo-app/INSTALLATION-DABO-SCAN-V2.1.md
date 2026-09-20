# DABO Scan V2.1

## 1. Copier le correctif
Décompresser le ZIP à la racine de `dabo-app` et accepter les remplacements.

## 2. Supabase — migration ciblée obligatoire
Dans Supabase > SQL Editor, exécuter **uniquement** :
`supabase-migrations/2026-09-09-dabo-scan-receipts.sql`

Ne pas exécuter `supabase-schema.sql`.

Cette migration ajoute l'historique des tickets, le membre ayant fait les achats, le total du ticket et le lien entre ticket et articles achetés. RLS reste activé.

## 3. Vérification locale
```powershell
npm run verify
```

Ne pousser sur GitHub qu'après PASS complet.

## Comportement V2.1
- Courses > Scanner contient uniquement Ticket de caisse + Liste de courses.
- Ticket validé : tous les articles sont créés dans Courses comme `bought`, même s'ils n'étaient pas prévus.
- « Qui a fait les achats ? » est obligatoire ; le membre connecté est présélectionné.
- Magasin, date, total et texte brut sont conservés pour le futur Budget/FACTURES.
- Liste validée : articles ajoutés à Courses comme `to_buy`.
- Le scan de brochure est déplacé dans Promos.
- Factures/documents ne sont plus proposés dans Courses ; ils appartiendront au futur module FACTURES.

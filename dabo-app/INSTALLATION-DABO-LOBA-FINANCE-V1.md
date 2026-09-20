# DABO — LOBA ↔ Finance V1

## Ce lot ajoute
- Lecture Finance ancrée côté serveur : dépenses du mois, dépenses de l'année, factures ouvertes, repères mensuels et ventilation mensuelle par catégorie.
- Confidentialité : LOBA ne reçoit que les données partagées du foyer et, le cas échéant, les données privées du membre connecté. Jamais celles d'un autre membre.
- Actions avec confirmation : `finance.expense.add`, `finance.bill.add`, `finance.bill.pay`.
- Paiement de facture atomique et protégé contre les confirmations obsolètes.
- Aucune action LLM → SQL : le modèle propose un objet borné ; l'API revalide ; l'utilisateur confirme ; le serveur exécute.
- Pas de facture récurrente via LOBA V1 : elle reste créée depuis Budget.

## Installation
1. Copier le contenu du ZIP à la racine de `dabo-app` et accepter les remplacements.
2. Lancer `npm run verify`.
3. Si tout est PASS, exécuter uniquement `supabase-migrations/2026-09-10-loba-finance-v1.sql` dans Supabase SQL Editor.
4. Commit/push via GitHub Desktop puis attendre Vercel Ready.
5. Valider en production séparément : lecture, ajout dépense, ajout facture, paiement facture et absence d'écriture avant confirmation.

## Important
Ne pas exécuter `supabase-schema.sql`. Ne jamais exposer `GROQ_API_KEY` ni `SUPABASE_SERVICE_ROLE_KEY`.

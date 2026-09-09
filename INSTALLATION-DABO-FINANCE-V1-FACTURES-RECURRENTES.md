# DABO Finance V1 — Factures récurrentes

Ce lot ajoute au formulaire `+ Facture` trois choix cliquables :
- Une seule fois
- Tous les mois
- Tous les ans

Une facture récurrente conserve une série distincte et crée ses échéances futures sans transformer celles-ci en dépenses. Le paiement continue d'utiliser le mécanisme atomique déjà validé.

Cas de fin de mois : une échéance ancrée au 31 utilise le dernier jour disponible d'un mois plus court.

## Ordre d'installation
1. Copier le contenu du ZIP à la racine de `dabo-app`.
2. Lancer `npm run verify`.
3. Seulement si la validation locale est PASS, exécuter dans Supabase SQL Editor : `supabase-migrations/2026-09-09-finance-v1-recurring-bills.sql`
4. Commit / Push / Vercel.
5. Tester en production une facture mensuelle.

Le ZIP ne contient ni `.env`, ni secret, ni dossier enveloppe.

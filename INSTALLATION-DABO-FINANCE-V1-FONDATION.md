# DABO Finance V1 — Fondation

Première étape du chantier Factures & Budget. Cette étape pose le modèle de données et le moteur de calcul ; elle n'ajoute pas encore l'écran Budget.

## Ce que cette fondation garantit
- dépenses du foyer séparées des factures à venir ;
- une facture payée référence une seule transaction afin d'éviter le double comptage ;
- factures ponctuelles + socle des factures récurrentes mensuelles/annuelles ;
- repères mensuels facultatifs par catégorie ;
- périodes semaine, mois, trimestre, semestre, année ;
- comparaison à la période précédente ;
- sessions Courses capables d'attendre 10 minutes de calme avant de demander le total ;
- une seule transaction financière par session Courses ;
- données cloisonnées par foyer ;
- finances privées invisibles aux autres membres ;
- aucune connexion bancaire, aucun paiement, aucune dette entre membres ;
- aucun package ni variable Vercel supplémentaire.

## Installation
1. Copier le contenu de ce ZIP directement à la racine de `dabo-app`.
2. Lancer `npm run verify`.
3. Si tout est vert, ouvrir Supabase SQL Editor.
4. Exécuter **uniquement** `supabase-migrations/2026-09-09-finance-v1-foundation.sql`.
5. Attendre `Success. No rows returned` avant le commit/push.

Ne jamais exécuter `supabase-schema.sql` pour cette étape.

## GitHub Desktop — Summary
`Pose les fondations de DABO Finance V1`

## Validation de cette étape
Cette phase devient PASS seulement après :
- `npm run verify` vert ;
- migration Supabase réussie ;
- Vercel `Ready` après commit/push.

L'UX Finance sera construite dans l'étape suivante : `Équilibre → Budget`.

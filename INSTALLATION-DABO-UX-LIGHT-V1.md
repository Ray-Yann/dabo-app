# DABO UX Light V1

1. Copier le contenu du patch à la racine de `dabo-app`.
2. Exécuter dans Supabase SQL Editor uniquement `supabase-migrations/2026-09-11-ux-light-v1-navigation-preferences.sql`.
3. Lancer `npm run verify`.
4. Après validation, commit/push puis attendre Vercel Ready.

## Ce qui change
- Navigation mobile: Aujourd'hui fixe + 4 destinations personnalisables + Plus fixe.
- Préférences synchronisées par compte utilisateur via Supabase.
- Finances devient une destination principale et remplace le nom Budget dans la navigation.
- Équilibre utilise une liste de vues au lieu de quatre sous-onglets simultanés.
- Finances utilise une liste de vues: Vue d'ensemble, Dépenses, Factures, Repères mensuels.
- Promos et Réglages restent accessibles dans Plus.

Aucune donnée métier existante n'est supprimée ou déplacée.

# DABO Planning V2

## Objectif
Transformer l'ancien Calendrier en surface temporelle du foyer sans casser les fonctions calendrier existantes.

## Livré
- Navigation Jour / Semaine / Mois.
- Filtres Tout / Moi / Foyer.
- Événements partagés et événements personnels privés.
- Échéances de tâches et factures à payer dans le flux Planning.
- Conservation de la création, modification, suppression, récurrence, rappels et complétion des événements.
- Surface responsive mobile/desktop et compatible avec les rôles de thème DABO clair/sombre.
- 14 nouvelles clés traduites dans les 7 catalogues actifs.
- Tests de non-régression `tests/planning-v2.test.ts`.

## Sécurité / confidentialité
Les événements personnels ne sont rendus que pour leur propriétaire. Planning n'ajoute aucune nouvelle table ni migration Supabase.

## Validation effectuée dans l'environnement de préparation
- `node scripts/check-i18n.mjs` : OK, 1130 clés dans FR/NL/EN/DE/ES/IT/PT.
- Tests ciblés Planning V2 + Navigation V2 + Aujourd'hui V2 : 12/12.
- Le `npm run verify` complet doit être exécuté dans le dépôt local de référence avant commit/push.

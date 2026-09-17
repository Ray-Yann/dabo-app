# DABO — Calendrier avancé V1

1. Copier `app`, `lib`, `tests`, `supabase` dans `dabo-app` en acceptant les remplacements.
2. Exécuter `supabase/migrations/20260917_calendar_advanced_v1.sql` dans Supabase SQL Editor.
3. Exécuter `npm run verify`.

Ajoute : événements/rappels, heure, notes, récurrence quotidienne/hebdomadaire/mensuelle/annuelle avec intervalle (ex. tous les 2 jours), date de fin optionnelle, affichage des occurrences dans le mois et prise en compte par le digest quotidien. Les anciens événements récurrents restent annuels.

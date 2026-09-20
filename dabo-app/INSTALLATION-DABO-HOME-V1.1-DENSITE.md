# DABO Home V1.1 — Densité et hiérarchie

Correctif UX ciblé après validation mobile de Home V1 en production.

## Changements
- AttentionCard plus compacte, sans modifier la logique Attention Engine.
- Suppression des raccourcis « Voir les courses » / « Voir les tâches » sous L’Essentiel : la navigation principale les rend redondants.
- Retrait de la bannière temporaire de migration de l’icône sur la Home. Le composant reste dans le projet ; seule son apparition sur Aujourd’hui est supprimée.
- Aucun changement Supabase, Finance, LOBA, RLS ou variables d’environnement.

## Validation
Après extraction à la racine du projet :

```powershell
npm run verify
```

La cible est 97 tests PASS, puis i18n, TypeScript et build PASS.

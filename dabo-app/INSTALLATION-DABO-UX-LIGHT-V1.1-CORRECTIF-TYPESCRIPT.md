# DABO UX Light V1.1 — Correctif TypeScript

Ce correctif remplace uniquement :

- `app/app/courses/page.tsx`
- `app/app/taches/page.tsx`

Il corrige les quatre erreurs TypeScript détectées après UX Light V1.1 :

- les états vides Courses/Tâches reçoivent l'action obligatoire attendue par `EmptyState` ;
- le bouton flottant Courses cible désormais la vue `to_buy` au lieu de l'ancien identifiant `courses`.

Aucune migration Supabase. Aucune modification de données ou de moteur métier.

Après copie du correctif :

```powershell
npm run verify
```

Cible attendue : 169/169 tests, 606 clés × 7 langues, TypeScript PASS, Build PASS.

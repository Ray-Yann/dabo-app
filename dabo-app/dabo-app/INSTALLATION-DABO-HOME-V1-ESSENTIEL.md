# DABO Home V1 — L’Essentiel orchestré

## Installation
Copier le contenu de ce ZIP directement à la racine du projet `dabo-app` et accepter les remplacements.

Le ZIP est déjà structuré avec les chemins projet :
- `app/app/page.tsx`
- `components/dabo/AttentionCard.tsx`
- `lib/i18n.ts`
- `tests/today-attention-home.test.ts`

## Ce que fait ce lot
- place « L’essentiel aujourd’hui » en tête du cockpit après les messages système utiles ;
- confie la sélection à `DABO Attention Engine V1` ;
- unifie Tâches, Courses, Finance, Calendrier et Équilibre dans une sélection de 3 éléments maximum ;
- conserve le silence quand rien ne mérite l’attention ;
- conserve les actions directes : terminer une tâche / un article, ouvrir Budget, Calendrier, Équilibre ou Tâches ;
- utilise `AttentionCard` du Design System ;
- rend les libellés des niveaux traduisibles FR/NL/EN.

Aucune migration Supabase. Aucun package. Aucune variable d’environnement. Aucun service payant.

## Validation
Lancer :

```powershell
npm run verify
```

Baseline avant ce lot : 90 tests. Ce lot ajoute 4 tests, cible attendue : 94/94, puis i18n, typecheck et build PASS.

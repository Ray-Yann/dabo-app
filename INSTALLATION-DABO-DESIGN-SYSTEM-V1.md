# DABO Design System V1

## But
Créer les primitives visuelles communes de DABO avant la refonte de la Home, sans modifier la logique métier.

## Contenu
- `components/dabo/AttentionCard.tsx`
- `components/dabo/QuickStatCard.tsx`
- `components/dabo/LobaInsightCard.tsx`
- `components/dabo/EmptyState.tsx`
- `components/dabo/SectionHeader.tsx`
- `components/dabo/index.ts`
- `components/EmptyState.tsx` (adaptateur rétrocompatible)
- `tests/dabo-design-system.test.ts`

## Installation
Copier le contenu du ZIP à la racine de `dabo-app` et accepter le remplacement de `components/EmptyState.tsx`.

Aucune migration Supabase. Aucune variable d'environnement. Aucun package supplémentaire.

## Validation
Lancer :

```powershell
npm run verify
```

Baseline avant ce lot : 85 tests. Ce lot ajoute 5 tests, donc cible : 90/90.

Ne pas pousser sur GitHub/Vercel avant validation complète.

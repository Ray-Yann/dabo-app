# DABO Attention Engine V1 — Fondation

## Contenu
- `lib/attention-engine.ts`
- `tests/attention-engine.test.ts`

Aucune migration Supabase. Aucune variable d'environnement. Aucune modification visuelle d'Aujourd'hui.

## But
Créer la couche déterministe commune de priorité avant son branchement à Aujourd'hui :
- 4 niveaux : action immédiate, anticipation, suggestion, information ;
- silence autorisé ;
- maximum 3 éléments principaux ;
- isolation du foyer actif ;
- visibilité foyer/privée ;
- snooze, résolution, expiration ;
- déduplication ;
- adaptateurs initiaux Tâches, Courses, Finance et insights DABO existants.

## Validation locale
Après copie à la racine du projet :

```powershell
npm run verify
```

Ne pas pousser sur GitHub/Vercel tant que la vérification complète n'est pas PASS.

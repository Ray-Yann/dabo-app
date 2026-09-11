# DABO — Navigation Persistence V1

## Problème corrigé
La personnalisation de l'ordre des onglets pouvait revenir à l'ordre précédent après fermeture de la fenêtre de personnalisation.

Cause identifiée : le chargement Supabase des préférences dépendait de `catalog`, qui était recréé à chaque rendu car `useT()` renvoie une nouvelle fonction. Après un changement d'ordre, l'effet pouvait relire la valeur Supabase précédente avant la fin de la sauvegarde et écraser l'ordre choisi à l'écran.

Un second risque existait lors de plusieurs déplacements rapides : plusieurs `upsert` pouvaient partir en parallèle et terminer dans un ordre différent de celui des clics.

## Correction
- Le chargement des préférences ne dépend plus de `catalog`.
- Les clés d'onglets valides sont définies indépendamment des libellés traduits.
- Une réponse de chargement devenue obsolète est ignorée.
- Les sauvegardes sont sérialisées pour conserver strictement l'ordre des changements.
- Aucun changement Supabase, aucune migration, aucune nouvelle traduction.

## Fichiers à remplacer/ajouter
- `components/DaboMainNav.tsx`
- `tests/navigation-persistence-v1.test.ts`

## Vérification
Après copie dans le projet :

```powershell
npm run verify
```

Puis tester en production après Vercel Ready :
1. Plus → Personnaliser.
2. Changer l'ordre de plusieurs onglets.
3. Appuyer sur Terminé puis fermer Plus.
4. Naviguer vers une autre page.
5. Recharger complètement l'application.
6. Vérifier que le même ordre est conservé.

## Contrôles déjà effectués sur la base fournie
- 196/196 tests Node PASS.
- 606 clés × 7 langues PASS.
- `check:env` PASS.
- TypeScript/build à confirmer sur le poste utilisateur via `npm run verify` (le ZIP propre ne contient pas `node_modules`).

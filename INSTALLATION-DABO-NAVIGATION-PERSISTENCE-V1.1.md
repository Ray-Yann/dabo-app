# DABO Navigation Persistence V1.1

Correctif production du maintien de l'ordre personnalisé de la navigation.

## Installation
Copier le contenu de ce ZIP à la racine du dossier `dabo-app` et accepter le remplacement des fichiers.

## Fichiers modifiés
- `components/DaboMainNav.tsx`
- `lib/household-context.tsx`
- `tests/navigation-persistence-v1-1.test.ts`

## Ce que corrige V1.1
- stabilise l'instance Supabase partagée par le HouseholdProvider ;
- empêche une lecture Supabase tardive d'écraser un ordre modifié localement ;
- conserve la sérialisation des sauvegardes rapides de V1 ;
- attend la fin de la file de sauvegarde lorsque l'utilisateur valide la personnalisation.

Aucune migration Supabase. Aucune nouvelle clé i18n.

## Vérification
```powershell
npm run verify
```

Attendu : 198/198 tests, i18n 606 x 7, TypeScript PASS, Build PASS.

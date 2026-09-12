# DABO — Security Households V1

Base de départ : `dabo-app-PROPRE-20260912-080246.zip`

## Ce lot corrige
- La lecture de `households` est limitée aux foyers dont l'utilisateur est membre actif.
- Les codes d'invitation ne sont plus recherchés directement côté client.
- Le multi-foyers rejoint désormais un foyer via `join_household_by_invite`.
- La création d'un foyer + son membre `creator` devient atomique via `create_household_with_creator`.
- Les insertions directes sensibles dans `households` et `members` sont retirées.
- Les mises à jour directes de `members` sont limitées aux colonnes de profil.
- Une promotion au rôle `creator` passe par un RPC dédié qui vérifie que l'appelant est déjà creator du foyer.

## Installation

### 1. Supabase
Exécuter uniquement la migration :
`supabase-migrations/2026-09-12-security-households-v1.sql`

Ne pas relancer `supabase-schema.sql`.

### 2. Projet
Copier le contenu du ZIP à la racine du projet DABO et accepter les remplacements.

### 3. Vérification
```powershell
npm run verify
```

Résultat attendu :
- 253/253 tests
- 634 clés × 7 langues
- TypeScript PASS
- Build production PASS

### 4. Ne pas pousser sur GitHub avant validation complète
Après le `verify`, transmettre la sortie complète avant Commit/Push.

# DABO Courses V3 — correctif de non-régression magasins

Ce correctif ne change aucune logique métier et ne nécessite aucune migration Supabase.

Il met à jour cinq tests historiques qui supposaient que l'appel `from("household_stores").insert(...)` était écrit sur une seule chaîne contiguë. Courses V3 conserve bien l'insertion dans `household_stores`, mais la chaîne Supabase est maintenant formatée sur plusieurs lignes afin de récupérer le magasin inséré avec `.select(...).single()`.

Les assertions continuent de vérifier les mêmes garanties :
- un magasin saisi ou choisi reste propre au foyer ;
- aucun magasin manuel n'est élevé dans `global_stores` ;
- `Autre magasin` reste disponible ;
- le catalogue national et les magasins du foyer restent séparés.

Après copie du patch, exécuter :

```powershell
npm run verify
```

Cible : 247/247 tests, 634 clés × 7 langues, TypeScript PASS, Build PASS.

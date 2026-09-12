# DABO — Courses V3 : magasins à proximité

## Installation
Copier le contenu du patch dans la racine `dabo-app` en acceptant le remplacement des fichiers.

## Supabase
Aucune migration SQL.
Aucune table de géolocalisation n'est créée et DABO ne stocke pas les coordonnées GPS.

## Fonctionnement
- La position n'est demandée qu'après clic sur **Magasins près de moi**.
- DABO utilise `getCurrentPosition()` uniquement, jamais un suivi continu.
- Les coordonnées exactes ne sont pas enregistrées dans Supabase.
- Avant la recherche OpenStreetMap, la position envoyée au fournisseur est arrondie à ~100 m.
- La route serveur est réservée aux utilisateurs authentifiés, applique un court anti-spam et un cache spatial temporaire de POI publics.
- Un magasin choisi devient uniquement un magasin personnel du foyer ; il ne rejoint jamais le catalogue national.
- Si la permission est refusée ou le fournisseur indisponible, le fonctionnement Courses existant reste intact.

## Vérification
```powershell
npm run verify
```

Cible : 247 tests, 634 clés × 7 langues, TypeScript PASS, build production 30/30 ou plus selon les routes API (les pages statiques restent 29/29).

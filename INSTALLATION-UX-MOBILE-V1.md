# DABO — Correctif UX Mobile V1

Ce patch corrige uniquement l'interface et n'ajoute aucune migration SQL.

## Changements
- retrait du scan de brochure dans Promos pendant la mise en attente de DABO Scan ;
- simplification de l'ajout manuel d'une promotion ;
- prise en charge de `safe-area-inset-top` et `safe-area-inset-bottom` sur iPhone/PWA ;
- barre de navigation placée au-dessus de l'indicateur Home iOS ;
- espace de contenu réservé pour éviter qu'il soit masqué par la navigation ;
- adaptation des six onglets aux écrans étroits ;
- `viewport-fit=cover` et couleur système cohérente avec le fond clair DABO.

## Installation
Décompresser le ZIP directement à la racine de `dabo-app` et accepter les remplacements.

Puis exécuter :

```powershell
npm run verify
```

Aucun SQL Supabase n'est nécessaire.

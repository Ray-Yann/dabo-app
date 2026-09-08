# DABO — Acquisition V1

Cette mise à jour ajoute l’onglet **Acquisition** au cockpit administrateur.

## Fichiers à remplacer
Copier le contenu de ce ZIP à la racine du projet `dabo-app` et accepter le remplacement des fichiers :
- `app/admin/page.tsx`
- `app/api/admin/dashboard/route.ts`

## Base de données
**Aucune migration SQL à exécuter.** Acquisition V1 utilise les tables déjà présentes : `acquisition_events` et `app_share_events`.

## Ce que mesure Acquisition V1
- visiteurs uniques instrumentés ;
- inscriptions réellement observées par le funnel ;
- inscriptions attribuées à un lien « Faire connaître DABO » ;
- foyer et première valeur après un partage attribué ;
- liens de partage créés, visités et ayant mené à une inscription ;
- conversion visite → inscription ;
- distinction stricte entre `Partage DABO attribué` et `Sans attribution mesurée`.

`Sans attribution mesurée` ne veut pas dire accès direct : DABO refuse de deviner une source qu’il ne mesure pas.

## Vérification locale
Dans PowerShell, à la racine de `dabo-app` :

```powershell
npm run verify
```

Si tout passe, commit/push via GitHub Desktop, attendre **Vercel Ready**, puis tester réellement l’onglet **Administration DABO → Acquisition** en production.

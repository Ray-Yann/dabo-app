# DABO — Admin Engagement V1

## Contenu
Ce correctif ajoute l'onglet **Engagement** au cockpit administrateur.

Il mesure uniquement des usages observables et ne les présente pas comme de la rétention :
- foyers actifs sur 7 jours ;
- foyers actifs sur 30 jours ;
- actions utiles sur 30 jours (tâches terminées + courses achetées + événements créés) ;
- moyenne d'actions utiles par foyer actif ;
- foyers utilisant Tâches, Courses et Calendrier ;
- foyers utilisant au moins 2 modules ;
- foyers utilisant les 3 modules.

## Installation
Copier les fichiers du ZIP dans le dossier racine `dabo-app` et accepter le remplacement des fichiers existants.

Fichiers modifiés :
- `app/admin/page.tsx`
- `app/api/admin/dashboard/route.ts`

Aucune migration SQL et aucune nouvelle variable Vercel ne sont nécessaires.

## Validation locale
Dans PowerShell, à la racine de DABO :

```powershell
npm run verify
```

Le correctif n'est validé en production qu'après :
1. `npm run verify` réussi ;
2. commit + push GitHub Desktop ;
3. Vercel `Ready` ;
4. ouverture réelle de `/admin` puis de l'onglet **Engagement**.

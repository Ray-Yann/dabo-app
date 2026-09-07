# DABO — Admin V2

Ce correctif part du ZIP `dabo-app(20260907-213213).zip` et conserve le correctif Samsung V2.

## Installation
Copier le contenu de ce ZIP à la racine de `dabo-app` et accepter le remplacement des 2 fichiers :
- `app/admin/page.tsx`
- `app/api/admin/dashboard/route.ts`

Aucune migration SQL et aucune nouvelle variable Vercel ne sont nécessaires.

## Vérification locale
Dans PowerShell, à la racine de dabo-app :

    npm run verify

## Ce qui est ajouté
- Navigation Admin : Vue d'ensemble / Utilisateurs / Foyers
- Recherche Utilisateurs (nom, e-mail, foyer)
- Date d'arrivée, foyers, rôles, activité 30 jours
- Recherche Foyers (foyer ou membre)
- Membres et rôles de chaque foyer
- Activité foyer sur 30 jours : tâches, courses, événements
- Statut actif/inactif sur 30 jours
- Les KPI « Nouveaux » utilisent maintenant la date du compte Auth lorsqu'elle est disponible, plutôt que seulement la date d'adhésion au foyer.

## Sécurité
Lecture seule. Aucun bouton de suppression/modification de compte. La clé service-role reste côté serveur.

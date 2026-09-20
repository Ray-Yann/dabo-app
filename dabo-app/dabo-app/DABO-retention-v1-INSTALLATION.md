# DABO — Admin Rétention V1

## Ce que ce correctif ajoute
- nouvel onglet **Rétention** dans le cockpit administrateur ;
- cohortes basées sur la première `signup_completed` mesurée par identité ;
- rétention **J1 / J7 / J30** : retour `app_open` dans la fenêtre de 24 h commençant à D+N ;
- dénominateur éligible séparé pour chaque échéance ;
- seuil de prudence : moins de 5 inscrits éligibles = **Données insuffisantes** ;
- tableau des 12 cohortes d'inscription les plus récentes ;
- déduplication d'une même identité pour éviter de compter deux fois une inscription ;
- LOBA continue de lire les KPI de rétention déjà instrumentés.

## Important
La mesure ne reconstruit pas la rétention des comptes créés avant l'instrumentation `acquisition_events`. Elle préfère afficher des données insuffisantes plutôt qu'un taux trompeur.

## Installation
Copier le contenu du ZIP à la racine de `dabo-app` et accepter le remplacement.

Fichiers ajoutés/modifiés :
- `app/admin/page.tsx`
- `app/api/admin/dashboard/route.ts`
- `lib/retention.ts`
- `tests/retention.test.ts`
- `DABO-retention-v1-INSTALLATION.md`

Aucune migration SQL. Aucune nouvelle variable Vercel.

## Validation
```powershell
npm run verify
```
Puis commit/push, attendre Vercel `Ready`, ouvrir `/admin` → **Rétention** et vérifier l'affichage réel.

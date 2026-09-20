# DABO V2 — Bilan du foyer V1

Base: dabo-app-PROPRE-20260916-005847.zip

## Ajouts
- `lib/household-weekly-report.ts` : moteur déterministe du bilan sur 7 jours.
- `app/app/bilan/page.tsx` : écran « Votre semaine à la maison ».
- `tests/household-weekly-report-v1.test.ts` : tests de seuil, équilibre, non-culpabilisation.
- `lib/i18n.ts` : catalogue Bilan V1 complet dans les 7 langues.
- `app/app/equilibre/page.tsx` : accès au Bilan depuis Tendances.

## Règles V1
- uniquement contributions confirmées et non annulées ;
- minimum 4 contributions avant conclusion d’équilibre ;
- fenêtre glissante de 7 jours ;
- tâches collectives partagées à parts égales comme le moteur DABO V1 ;
- aucune note, aucun classement, aucun jugement d’un membre ;
- aucune suggestion si la répartition est saine ou si les données sont insuffisantes ;
- aucune nouvelle table Supabase.

## Vérifications effectuées ici
- `npm run check:i18n` : PASS — 719 clés FR/NL/EN/DE/ES/IT/PT.
- `npm test` : PASS — 272/272.
- Le `npm ci` complet a dépassé le temps d’exécution de l’environnement de préparation, donc `typecheck/build` doivent être confirmés localement avec `npm run verify` avant déploiement.

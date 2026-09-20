# DABO Insights V1 — Tendances du foyer

## Objectif
Ajouter une lecture rétrospective douce dans Équilibre, distincte des alertes de la Home.

## Comportement
- nouvel onglet `Tendances` dans Équilibre > Organisation ;
- compare les 7 derniers jours aux 7 jours précédents ;
- utilise uniquement les contributions confirmées ;
- minimum 4 contributions avant interprétation ;
- qualifie la tendance comme amélioration, stabilité ou écart qui se dessine ;
- aucune note, aucun classement, aucune notification ;
- aucune nouvelle table ni migration Supabase.

## Fichiers
- `lib/household-insights.ts`
- `app/app/equilibre/page.tsx`
- `lib/i18n.ts`
- `tests/insights-v1.test.ts`

## Validation
```powershell
npm run verify
```

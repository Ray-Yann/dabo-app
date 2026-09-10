# DABO Home V1.3 — Hiérarchie intelligente de l’attention

Base : dabo-app-PROPRE-20260911-004302.zip

## Ce lot ajoute
- la première attention sélectionnée par Attention Engine devient visuellement prioritaire ;
- les deuxième et troisième attentions restent compactes ;
- aucun nouveau bloc sur la Home ;
- aucun nouveau texte i18n ;
- aucun changement dans le classement ou la logique métier d’Attention Engine ;
- l’état de silence reste inchangé ;
- la Vue rapide du foyer reste inchangée ;
- aucune migration Supabase.

## Validation
Les nouveaux tests unitaires Home V1.3 ont été ajoutés.
Dans l’environnement de préparation, la suite de tests a atteint les tests Home V1.3 avec succès.
La validation TypeScript/build complète doit être exécutée dans l’environnement projet avec ses dépendances installées.

```powershell
npm run verify
```

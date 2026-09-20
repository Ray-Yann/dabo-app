# DABO UX Light V1.2.1 — Catalogue magasins strict par pays

Base : DABO UX Light V1.2 déjà déployée (issue de `dabo-app-PROPRE-20260911-032837.zip`).

## Installation
Copier le contenu de ce dossier à la racine de `dabo-app` en remplaçant les fichiers existants.

Aucune migration Supabase.

## Correction
Le sélecteur de magasin de Courses contient désormais uniquement :
1. les enseignes du catalogue DABO explicitement vérifié pour le pays du foyer ;
2. les magasins personnels déjà appris par ce foyer ;
3. « Autre magasin… » pour une saisie manuelle.

La source mondiale NSI ne remplit plus directement le menu. Le catalogue historique `global_stores` reste intact en base mais n'alimente pas ce sélecteur.

## Validation attendue
`npm run verify`

Cible : 178/178 tests, i18n 606 clés × 7 langues, TypeScript PASS, Build PASS.

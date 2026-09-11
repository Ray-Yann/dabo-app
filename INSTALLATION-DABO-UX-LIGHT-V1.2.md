# DABO UX Light V1.2 — Finitions & magasins par pays

Base: `dabo-app-PROPRE-20260911-032837.zip`

## Installation
Copier le contenu de ce dossier à la racine de `dabo-app` en remplaçant les fichiers existants.

Aucune migration Supabase à exécuter.

## Changements
- Courses : suppression du titre « À acheter » redondant.
- Magasins : les marques NSI marquées seulement `001` (mondiales) ne sont plus considérées comme présentes dans tous les pays.
- Magasins : les enseignes populaires vérifiées du pays sont proposées en premier.
- Magasins : un magasin manuel est appris uniquement par le foyer ; il n'est plus promu automatiquement dans le catalogue national partagé.
- Magasins : le catalogue communautaire historique `global_stores` reste en base pour compatibilité, mais n'alimente plus directement les suggestions de Courses.
- Calendrier : suppression du grand encart d'introduction dans « À venir » ; l'aide reste disponible dans « Personnel ».
- Calendrier : une occurrence récurrente située l'année suivante affiche désormais explicitement l'année.
- Navigation : libellé Calendrier légèrement plus compact pour éviter la troncature sur mobile.

## Validation attendue
`npm run verify`

Cible : 175/175 tests, i18n 606 clés × 7 langues, TypeScript PASS, Build PASS.

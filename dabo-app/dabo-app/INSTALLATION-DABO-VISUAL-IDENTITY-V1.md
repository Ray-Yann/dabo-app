# DABO Visual Identity V1

## Objectif
Renforcer la personnalité de DABO sans casser UX Light.

## Changements
- profondeur de fond organique très légère avec les couleurs DABO existantes ;
- micro-interactions cohérentes et respect de `prefers-reduced-motion` ;
- états vides plus chaleureux avec le symbole pousse ;
- couleur/avatar membre visible dans les groupes de tâches ;
- largeur desktop portée à `max-w-3xl` tout en conservant `max-w-lg` sur mobile ;
- navigation desktop alignée sur la nouvelle largeur.

## Base
`dabo-app-PROPRE-20260911-035749.zip`

## Supabase
Aucune migration.

## Validation
Lancer `npm run verify`, puis effectuer une nouvelle revue visuelle mobile + desktop avant de déclarer PASS PRODUCTION UX.

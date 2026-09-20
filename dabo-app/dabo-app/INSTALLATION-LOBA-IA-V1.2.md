# LOBA IA V1.2 — qualité conversationnelle

Correctif sans migration SQL et sans nouvelle variable d'environnement.

- rendu Markdown sûr côté React (titres, gras, listes, tableaux) sans injection HTML ;
- réponses simples volontairement plus courtes ;
- séparation stricte faits DABO / interprétations / recommandations ;
- prudence explicite sur les valeurs nulles ou à zéro ;
- plafond de réponse réduit à 650 tokens ;
- aucun nouveau package npm.

Après copie des fichiers : `npm run verify`.

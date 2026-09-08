# DABO — LOBA V3 · Growth Engine

Base : dabo-app-PROPRE-20260908-095223.zip — LOBA V2 validé en production.

## Ajouts
- LOBA Growth Engine dans le cockpit Admin.
- Funnel visible : inscription → compte rattaché à un foyer → foyer actif 30 j → ambassadeur 30 j.
- 3 premières stratégies de campagne structurées avec hypothèse, prochaine action et garde-fou :
  1. partage après un moment utile ;
  2. démonstration sociale DABO en 20 secondes ;
  3. réactivation douce des foyers inactifs.
- Radar Produit LOBA :
  - Factures & Budget ;
  - Services & professionnels ;
  - Documents du foyer.
- Principes Growth : réduction de la charge mentale, pas de culpabilisation, mesure avant automatisation, autorisation avant dépenses/publications externes.

## Important
Cette étape construit le cerveau de décision Growth. Elle ne publie encore rien à l’extérieur et ne dépense aucun budget.

Aucun SQL.
Aucune nouvelle variable Vercel.
Aucun secret.

## Installation
Copier le contenu du ZIP à la racine de dabo-app puis :

    npm run verify

## Contrôle avant livraison
- check:i18n : PASS — 374 clés FR/NL/EN.
- Le typecheck du conteneur n’est pas exploitable car le ZIP propre exclut node_modules ; les dépendances React/Next ne sont donc pas présentes ici.
- Le `npm run verify` sur le PC DABO reste la validation de référence, comme pour les étapes précédentes.

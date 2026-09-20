# DABO — Audit final Cockpit Admin V1

Correctif de rigueur sémantique uniquement.

## Pourquoi
Dans l’onglet Utilisateurs, la donnée `lastActivity` correspond à l’activité récente des foyers auxquels le compte est rattaché, et non à une action individuelle prouvée de ce compte.

La V1 affichait donc « Actif · 30 j » / « Dernière activité DABO », ce qui pouvait être interprété comme une activité individuelle.

## Correction
- « Actifs · 30 j » → « Dans un foyer actif · 30 j » pour les comptes.
- « Inactifs · 30 j » → « Sans foyer actif · 30 j » pour les comptes.
- « Dernière activité DABO » → « Dernière activité du/des foyer(s) ».
- Les libellés de l’onglet Foyers restent inchangés.

Aucune migration SQL. Aucune variable d’environnement. Aucun secret.

# DABO Planning V2.2.2 — rail temporel premium

Correctif visuel strictement ciblé sur la timeline de la vue Jour.

## Objectif

Éviter qu’un libellé temporel comme `18:00` ou `Journée` paraisse collé au marqueur de la timeline.

## Principe

Le libellé, le marqueur et l’axe vertical disposent désormais de zones géométriques distinctes. Le marqueur reste centré sur l’axe tandis qu’un espace de respiration explicite est réservé entre le texte et ce marqueur, sur desktop comme sur mobile.

Aucune logique métier, donnée, migration SQL, récurrence, créneau, responsabilité, vue Semaine ou vue Mois n’est modifiée.

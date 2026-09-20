# DABO — Intelligence sur Aujourd’hui V1.1 — Fiabilité du signal

Correctif minimal de la Home.

- distingue explicitement « données en cours de chargement » de « aucun signal utile » ;
- empêche le moteur hebdomadaire de conclure avant la fin de la lecture des contributions ;
- journalise une erreur de chargement au lieu de la transformer en faux silence ;
- protège les mises à jour d’état lorsqu’une lecture devient obsolète ;
- aucune migration Supabase, aucune dépendance, aucune IA payante.

Copier `app` et `tests` à la racine de `dabo-app`, puis lancer `npm run verify`.

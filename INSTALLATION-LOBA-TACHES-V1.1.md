# LOBA Assistant × Tâches V1.1 — correctif test

Ce correctif remplace uniquement `tests/loba-household-ai.test.ts`.

Il actualise l'assertion de sécurité devenue obsolète :
- ancien texte attendu : `ne l’exécutes jamais toi-même`
- texte actuel du prompt : `ne les exécutes jamais toi-même`

Aucune logique LOBA, aucune route API, aucune donnée et aucun composant n'est modifié.

Après extraction à la racine de `dabo-app`, lancer :

    npm run verify

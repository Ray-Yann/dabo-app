# LOBA Phase 3 — Modification sécurisée des tâches V1

## Périmètre
Cette version autorise uniquement la modification de l'attribution d'une tâche existante via LOBA.

Exemple de test : `Attribue nettoyer ma chambre à Manga.`

## Sécurité
- LOBA prépare l'action, elle ne l'exécute pas.
- L'utilisateur doit cliquer sur **Confirmer** avant l'écriture.
- Le serveur vérifie que la tâche appartient toujours au foyer actif et est encore en cours.
- Le serveur vérifie que le membre cible appartient toujours au foyer actif.
- L'attribution actuelle est revérifiée au moment de la confirmation pour éviter d'écraser un changement plus récent.
- Aucun autre champ de la tâche n'est modifié.
- Si plusieurs tâches correspondent, LOBA doit demander laquelle au lieu de choisir.

## Installation
Copier les fichiers du ZIP à la racine du projet en conservant les dossiers et en remplaçant les fichiers existants.

Aucune migration SQL. Aucune nouvelle variable d'environnement. Aucun nouveau package.

Puis lancer :

    npm run verify

Ne déployer qu'après validation complète de `verify`.

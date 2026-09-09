# DABO — LOBA Actions complètes V1

Correctif cumulatif à copier à la racine du projet DABO.

## Contenu
- Courses : ajout, modification (nom, quantité, date, attribution, urgence) et suppression.
- Tâches : ajout, modification (nom, date, attribution, urgence, durée, effort) et suppression des tâches non récurrentes.
- Calendrier : ajout, modification (titre/date) et suppression.
- Conversation multi-tour conservée.
- Confirmation obligatoire avant chaque écriture.
- Contrôle anti-obsolescence : le serveur vérifie que l'élément n'a pas changé depuis la proposition.
- Contrôle du foyer actif et des membres côté serveur.
- Calendrier personnel : seul le propriétaire connecté peut modifier/supprimer son événement personnel.
- Portée calendrier personnel/foyer immuable via LOBA.
- Fréquence/récurrence non modifiable via LOBA.
- Suppression d'une tâche récurrente volontairement refusée par LOBA : la page Tâches reste nécessaire pour choisir la portée de suppression.

## Installation
1. Décompresser ce ZIP.
2. Copier son contenu directement à la racine de `dabo-app` en remplaçant les fichiers existants.
3. Exécuter `npm run verify`.
4. Si tout est vert : commit/push avec GitHub Desktop puis attendre Vercel Ready.
5. Valider en production plusieurs scénarios avant de déclarer la phase PASS.

Aucun SQL, aucun nouveau package et aucune nouvelle variable Vercel.

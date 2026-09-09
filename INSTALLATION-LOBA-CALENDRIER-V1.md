# LOBA Assistant × Calendrier V1

Ajoute la création contrôlée d'événements calendrier à LOBA.

- `calendar.add` uniquement ; aucune modification/suppression.
- Confirmation explicite obligatoire avant écriture.
- Portée obligatoire : `household` ou `personal`.
- Un événement personnel est forcé côté serveur vers `private_owner_id = membre connecté`.
- Aucun autre membre ne peut être choisi comme propriétaire d'un événement personnel.
- Pas de récurrence dans cette V1.
- Le schéma actuel stocke une date mais pas une heure structurée : une heure explicitement donnée est conservée dans le titre.
- Aucun SQL, package ou variable d'environnement supplémentaire.

Après extraction à la racine de `dabo-app` :

    npm run verify

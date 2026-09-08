# DABO Scan — mise en attente

Ce correctif masque DABO Scan de l'interface Courses tant qu'une solution de reconnaissance gratuite suffisamment fiable n'est pas disponible.

- Courses et Promos restent visibles et fonctionnels.
- Le code expérimental DABO Scan n'est pas supprimé : il reste dans le projet pour une reprise future.
- Aucune migration Supabase n'est nécessaire.
- Aucun service payant n'est ajouté.

Après extraction à la racine de `dabo-app`, lancer :

    npm run verify

Puis seulement après validation : commit/push et test production.

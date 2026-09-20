# LOBA Assistant DABO — Phase 2

Première action contrôlée : ajout d'un article aux Courses.

Sécurité :
- l'IA ne réalise jamais l'écriture ; elle produit seulement une proposition structurée ;
- l'interface affiche Confirmer / Annuler ;
- le serveur revérifie la session et l'appartenance au foyer lors de la confirmation ;
- seule l'action `shopping.add` est autorisée ;
- aucune action sur tâches, calendrier, membres, suppression ou modification ;
- aucune migration SQL, aucun package, aucune nouvelle variable d'environnement.

Validation : `npm run verify`, puis production : demander « Ajoute du lait aux courses », vérifier qu'aucune ligne n'est créée avant Confirmer, cliquer Confirmer, puis vérifier Courses.

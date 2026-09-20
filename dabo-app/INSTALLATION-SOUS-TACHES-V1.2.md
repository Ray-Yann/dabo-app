# DABO V2 — Sous-tâches V1.2

Correctif minimal :
- pérennise les droits CRUD `authenticated` de `task_subtasks` dans une migration ;
- remplace le symbole mojibake `âœ“` par le vrai caractère UTF-8 `✓` dans les confirmations Tâches ;
- ajoute des tests de non-régression.

La permission est déjà active en production après le GRANT manuel ; la migration garantit les futurs environnements/restaurations.

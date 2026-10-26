# DABO — Mes réserves / 36H.5F — versionnement transactionnel

## Contenu
- `supabase/migrations/20261023_courses_reserves_movement_version_v1.sql`: migration additive, transactionnelle.
- `tests/courses-reserves-movement-version-v1.test.ts`: contrôles statiques de régression.

## Ordre et conditions
1. Ne pas appliquer en production avant validation PostgreSQL complète sur une copie isolée.
2. Les migrations du 20, 21 et 22 octobre doivent déjà être appliquées.
3. Vérifier que la migration du 23 octobre n'a jamais été appliquée. Elle n'est **pas** conçue pour être relancée une seconde fois (contraintes et trigger nommés).
4. Sauvegarder la base et disposer d'un plan de restauration validé.
5. Appliquer avec le mécanisme de migration Supabase habituel, une seule fois et après validation.
6. Les mouvements historiques restent `movement_version IS NULL`; les crédits historiques ne sont pas automatiquement compensés.

## Sécurité / portée
- Ne modifie pas les migrations précédentes.
- Ne supprime aucune donnée et ne réécrit pas les mouvements historiques.
- Refuse l'annulation automatique si un autre mouvement est intervenu depuis le crédit.
- Les fonctions de transfert et de changement de stock existantes sont conservées ; le trigger versionne leurs nouveaux mouvements.
- Le SQL ne doit pas être exécuté sur la base `postgres` du laboratoire.

## Vérifications nécessaires avant production
- Tester la migration sur une copie fraîche des migrations DABO et vérifier l'intégrité.
- Tester un **nouvel achat versionné** suivi d'une annulation immédiate (compensation une fois), puis un autre nouvel achat versionné suivi d'une consommation et annulation (`correction_needed` sans compensation).
- Tester concurrence achat/consommation/annulation, transfert partiel, retour arrière transactionnel, permissions et historique.
- Exécuter les tests TypeScript dans le dépôt réel et contrôler `git diff`, puis vérifications complètes du projet.

## Vérifications effectuées sur l'archive
- Comparaison ciblée avec la migration d'origine et tests statiques Node.js.
- Les tests d'intégration PostgreSQL ne sont pas exécutables dans cet environnement (pas de serveur PostgreSQL/Docker accessible).

## Retour arrière
La migration étant transactionnelle, une erreur pendant l'application doit annuler la transaction entière. Après application réussie, ne pas retirer le versionnement sans analyse des mouvements déjà créés ; préférer une restauration contrôlée ou une migration de correction explicite.

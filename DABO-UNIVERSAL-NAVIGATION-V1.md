# DABO Universal — Navigation V1

Cette livraison constitue la **première tranche de la phase 1**, et non la refonte complète de DABO Universal.

## Livré
- Barre de navigation : Aujourd'hui | Apps | + | Mes espaces | Moi.
- Apps : liens vers les modules existants Planning, Courses, Tâches, Finances ; accès Équilibre et Promos.
- Mes espaces : accès au foyer actuel, sans prétendre que les groupes universels sont déjà opérationnels.
- Moi : point d'entrée vers les réglages existants.
- Bouton + : logique existante conservée.
- Catalogue i18n : six clés nouvelles renseignées dans les sept langues actuellement activées.

## Non livré / à traiter ensuite
- Espace personnel autonome et groupes universels (modèle de données, RLS, migrations et tests).
- Gestion de contexte et permissions multi-espaces.
- Écrans natifs de profil et notifications à partir de Moi (actuellement redirection vers Réglages).
- Refonte des mini-apps métier, moteur LOBA et vérification de production.

## Vérifications
- `node scripts/check-i18n.mjs` : OK (1237 clés, 7 langues).
- Installation des dépendances / typecheck / suite complète : **non validés** (installation npm interrompue par délai d'exécution).
- Aucune migration SQL ni écriture sur la base de production.

Ne déployer qu'après `npm run verify` réussi localement et revue du rendu.

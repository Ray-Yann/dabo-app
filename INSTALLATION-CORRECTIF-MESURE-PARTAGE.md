# Correctif DABO — mesure partage + acquisition

Ce patch ne demande aucune nouvelle migration SQL et ne contient aucun secret.

Il corrige deux points :
1. le funnel d'acquisition vérifie désormais le bearer séparément du client service-role qui écrit en base, afin de préserver le bypass RLS ;
2. la mesure du partage vérifie réellement la réponse API, retente une fois après rafraîchissement de session en cas de 401 et utilise `keepalive`.
3. les événements d'acquisition non enregistrés sont conservés temporairement dans le navigateur et retentés automatiquement (maximum 50), sans bloquer DABO.

## Installation
Copier le contenu du ZIP à la racine du projet DABO en acceptant le remplacement des fichiers.

Puis lancer :

    npm run verify

Après PASS, commit/push avec GitHub Desktop puis attendre Vercel Ready.

## Test production
1. Ouvrir DABO après le nouveau déploiement.
2. Aller dans Réglages > Faire connaître DABO et effectuer un partage réel.
3. Dans Supabase > Table Editor, actualiser `app_share_events` : une ligne doit apparaître.
4. Actualiser `acquisition_events` : au minimum un `app_open` doit apparaître après ouverture de `/app`.

Ne pas insérer de lignes manuellement.

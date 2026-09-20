# DABO — Correctif LOBA Finance lecture V1

## Cause traitée
La route LOBA transformait silencieusement une erreur de lecture Finance en tableau vide (`data || []`), ce qui pouvait devenir une réponse trompeuse « 0 € ». Elle appliquait aussi une plage annuelle directement dans la requête alors que Budget charge les transactions puis utilise le moteur Finance pour calculer la période.

## Correctif
- charge les transactions Finance du foyer puis calcule mois/année avec le même moteur que Budget ;
- normalise les dates civiles avant calcul ;
- refuse de répondre avec un faux 0 si une requête Finance échoue ;
- ajoute `transactionCount` aux agrégats transmis à LOBA pour renforcer l'ancrage ;
- aucune migration Supabase ; aucune nouvelle dépendance.

## Installation
Copier le contenu du ZIP à la racine de `dabo-app`, accepter les remplacements, puis lancer `npm run verify`.
Ne rien modifier dans Supabase pour ce correctif.

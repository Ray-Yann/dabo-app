# DABO — Notifications Recovery V1

Copier les dossiers `app`, `lib` et `tests` à la racine de `dabo-app`, puis accepter le remplacement des fichiers existants.

Aucune migration Supabase et aucune nouvelle dépendance.

Le patch :
- restaure l'envoi Push pour les comptes multi-foyers en recherchant l'abonnement sur tous les profils actifs du même compte ;
- restaure la notification lorsqu'un membre rejoint un foyer ;
- restaure la notification d'un achat marqué depuis Aujourd'hui ;
- ajoute la traduction du nouveau membre dans les 7 langues actives ;
- déduplique les endpoints avant envoi.

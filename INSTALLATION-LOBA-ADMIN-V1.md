# DABO — LOBA / Admin Intelligence V1

Cette mise à jour ajoute la première brique de LOBA sans modifier les données familiales existantes.

## Ce qui est ajouté

1. Accès **Administration DABO** directement dans `Réglages > Mes foyers`.
   - visible uniquement pour un compte réellement autorisé par `DABO_ADMIN_EMAILS`;
   - l'administration n'est PAS créée comme un faux foyer;
   - le contrôle d'autorisation reste effectué côté serveur.

2. Nouvelle route sécurisée :
   - `/api/admin/status`
   - elle ne renvoie qu'un booléen `isAdmin`.

3. Nouveau bloc **LOBA Intelligence** dans le cockpit administrateur.
   LOBA compare les 30 derniers jours aux 30 jours précédents et peut signaler :
   - accélération ou ralentissement des inscriptions;
   - part de foyers actifs;
   - opportunités de bouche-à-oreille;
   - progression des partages;
   - progression de l'usage des tâches;
   - données insuffisantes lorsque le signal n'est pas assez solide.

4. Chaque signal LOBA contient :
   - ce qui change;
   - pourquoi cela compte;
   - l'action recommandée;
   - le KPI concerné.

5. Growth Lab « Faire connaître DABO ».
   Cette première version rappelle la prochaine étape : mesurer
   partage → visite → inscription → foyer activé.

## Installation

Copiez le contenu de ce ZIP à la racine de `dabo-app` et acceptez le remplacement des fichiers.

Aucun SQL à exécuter.
Aucune nouvelle variable Vercel.
Ne modifiez pas `DABO_ADMIN_EMAILS`.

Puis lancez :

    npm run verify

## Validation effectuée avant livraison

- tests DABO : 14/14 PASS
- i18n : PASS
- TypeScript : PASS

Le build complet n'a pas pu terminer dans l'environnement de génération parce que l'exécutable local Next.js n'avait pas la permission d'exécution dans ce conteneur (`next: Permission denied`). Ce n'est pas une erreur TypeScript ou applicative. Le `npm run verify` sur le PC DABO reste la validation de référence avant GitHub/Vercel.

## Important

Cette V1 ne rend pas encore LOBA conversationnel pour les utilisateurs classiques.
Elle installe :
- son identité;
- son intelligence de pilotage Admin;
- l'accès Admin depuis l'interface DABO.

La prochaine brique pourra introduire LOBA côté utilisateurs avec des suggestions contextuelles sûres avant toute action automatique.

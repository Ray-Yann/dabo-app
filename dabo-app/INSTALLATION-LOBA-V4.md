# DABO — LOBA V4 · Conversation

Base : dabo-app-PROPRE-20260908-103039.zip — LOBA V3 validé en production.

## Cette V4 ajoute

### LOBA Admin conversationnel
Dans LOBA Intelligence, un bloc « Parler à LOBA » permet de poser des questions sur :
- les priorités de DABO ;
- l’activation compte → foyer ;
- le funnel ;
- les foyers actifs ;
- le partage / les ambassadeurs ;
- la croissance et les campagnes.

Les réponses sont calculées uniquement à partir des KPI et signaux réellement présents dans le cockpit.
LOBA indique les limites des données au lieu d’inventer des métriques.

### LOBA conversationnel côté foyer
Sur Aujourd’hui, un bouton « Parler à LOBA » ouvre un assistant du foyer.
Il peut déjà répondre sur :
- ce qui mérite l’attention aujourd’hui ;
- les tâches en attente ;
- les courses ;
- la charge mentale / le calme du foyer.

Il reçoit uniquement le contexte du foyer actuellement ouvert.

## Sécurité / autonomie
Cette V4 ne contacte aucun service externe, ne publie rien et ne dépense rien.
Elle n’ajoute aucune clé d’API et aucun secret.
Les futures actions externes resteront soumises à des autorisations explicites.

## Installation
Copier le contenu de ce ZIP à la racine de dabo-app, accepter les remplacements, puis lancer :

    npm run verify

Aucun SQL.
Aucune nouvelle variable Vercel.

## Contrôles effectués avant livraison
- 14/14 tests du moteur : PASS.
- check:i18n : PASS dans l’environnement de génération.
- Le ZIP propre n’embarque pas node_modules ; le npm run verify du PC DABO reste la validation TypeScript/build de référence.

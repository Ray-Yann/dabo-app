# DABO — LOBA V2

Base utilisée : dabo-app-PROPRE-20260908-093621.zip (LOBA Admin V1 validé en production).

## Ce que cette V2 ajoute

### 1. LOBA devient visible pour les utilisateurs classiques
Sur « Aujourd’hui », l’ancien espace « Suggestions DABO » devient officiellement :
**LOBA · Assistant DABO**.

LOBA réutilise le moteur DABO déjà validé pour signaler, selon le foyer :
- tâches en retard ;
- événements proches ;
- déséquilibre de contribution ;
- attribution possible.

Même lorsqu’il n’y a aucune alerte, LOBA reste présent avec un état calme :
« LOBA veille sur ton foyer. Rien d’important à signaler pour le moment. »

Les données restent strictement celles du foyer auquel l’utilisateur a accès.

### 2. Première amélioration du diagnostic d’activation Admin
Deux KPI sont ajoutés :
- **Comptes sans foyer**
- **Activation compte → foyer**

LOBA Admin peut désormais détecter qu’une partie des inscrits n’atteint pas encore leur premier foyer et recommander une amélioration de l’onboarding.

### 3. Multilingue
Les nouveaux textes LOBA utilisateur sont intégrés en FR / NL / EN.

## Ce que cette V2 ne fait pas encore
LOBA n’est pas encore un chat conversationnel et n’exécute pas encore d’actions autonomes.
Cette étape installe proprement son identité côté utilisateur et renforce son intelligence Admin sans introduire d’API IA payante ni de nouvelle dépendance.

## Installation
Copier le contenu de ce ZIP à la racine de `dabo-app` et accepter le remplacement des fichiers.

Aucun SQL.
Aucune nouvelle variable Vercel.
Aucun secret.

Puis lancer :

    npm run verify

## Validation dans l’environnement de génération
Le contrôle i18n passe avec 374 clés statiques FR/NL/EN.
La validation npm complète a dépassé la fenêtre d’exécution du conteneur lors de l’installation des dépendances ; `npm run verify` sur le PC DABO reste donc la validation de référence.

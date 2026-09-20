# DABO — Sources of Truth

Ce document définit les sources de vérité canoniques de DABO.

Toute nouvelle fonctionnalité doit réutiliser ces sources et primitives lorsqu'elles existent.
Elle ne doit pas reconstruire en parallèle une autre interprétation du même concept métier.

## 1. Charge et contributions du foyer

### Source de vérité

La charge réellement accomplie est représentée par :

- `task_contributions`
- `task_contribution_participants`

Une tâche attribuée (`tasks.assigned_to`) représente une attribution opérationnelle.
Elle ne prouve pas qui a réellement effectué la tâche et ne doit donc pas servir de source de vérité pour mesurer la contribution réelle d'un membre.

### Primitive canonique

Fichier :

`lib/task-contributions.ts`

Fonction principale :

`computeContributionMemberPoints()`

Le calcul prend notamment en compte :

- les contributions confirmées ;
- les contributions non annulées ;
- la période demandée ;
- les participants réellement associés à la contribution ;
- `share_weight` ;
- une répartition égale de secours lorsque les poids ne permettent pas de calculer une répartition.

Cette primitive doit être réutilisée partout où DABO doit comparer ou agréger les contributions des membres.

## 2. Bilan et évolution du foyer

### Moteur canonique

`lib/household-insights.ts`

Ce moteur interprète l'évolution de la charge du foyer à partir des contributions réelles.

Il ne doit pas recalculer la contribution depuis `tasks.assigned_to`.

Les interfaces telles que Bilan, Équilibre ou Aujourd'hui peuvent présenter ses résultats, mais ne doivent pas créer leur propre définition concurrente de l'équilibre du foyer.

## 3. Suggestions d'attribution

### Moteur opérationnel

`lib/dabo-engine.ts`

Le moteur DABO conserve les recommandations opérationnelles :

- événements proches ;
- suggestions d'attribution.

Pour les evenements proches, DABO consomme le moteur canonique de recurrence `lib/calendar-recurrence.ts` au lieu de recalculer lui-meme les occurrences.

Pour une suggestion d'attribution, le moteur reçoit les points de contribution déjà calculés depuis la source canonique.

Il ne reconstruit pas l'historique de charge à partir des tâches terminées ou de `tasks.assigned_to`.

La rotation peut servir de départage lorsque plusieurs membres présentent le même niveau de contribution.

## 4. Principe de séparation

DABO distingue :

**Attribution**
: ce qui était prévu ou demandé.

**Contribution**
: ce qui a réellement été accompli et confirmé.

**Interprétation**
: ce que DABO peut raisonnablement déduire des contributions observées.

Ces trois niveaux ne doivent pas être confondus.

## 5. Règle pour les nouveaux moteurs

Avant d'ajouter un nouveau calcul métier :

1. vérifier si une primitive canonique existe déjà ;
2. réutiliser la donnée canonique plutôt que la recalculer depuis une donnée indirecte ;
3. garder les moteurs déterministes lorsque possible ;
4. séparer collecte des données, calcul métier et présentation ;
5. ajouter des tests de non-régression ;
6. documenter ici toute nouvelle source de vérité structurante.

## 6. Principe produit

DABO rend la charge du foyer visible, compréhensible et négociable.

Les moteurs ne doivent pas :

- classer les membres ;
- culpabiliser un membre ;
- présenter un partage 50/50 comme objectif universel ;
- transformer les points en compétition.

Les points sont un outil interne de représentation de la charge, pas un score de valeur personnelle.

## 7. Cartographie des moteurs canoniques

### Tâches

Données métier :
- `tasks`
- `routines`
- `task_contributions`
- `task_contribution_participants`

Responsabilités :

`lib/task-completion.ts`
: exécution et annulation de la complétion d'une tâche, ainsi que création de la prochaine occurrence récurrente.

`lib/task-contributions.ts`
: source canonique pour la contribution réellement accomplie.

`lib/types.ts`
: définition canonique du calcul des points d'une tâche via `computeTaskPoints()`.

Une attribution de tâche et une contribution accomplie restent deux concepts distincts.

### Courses

Données métier principales :
- `shopping_items`

Moteur :

`lib/dabo-shopping-engine.ts`

Responsabilités :
- analyser les habitudes d'achat ;
- générer les suggestions de courses ;
- appliquer les règles propres aux habitudes et suggestions.

Les interfaces ne doivent pas recréer indépendamment cette logique.

### Calendrier

Données métier principales :
- événements calendrier.

Moteur de récurrence :

`lib/calendar-recurrence.ts`

Responsabilités :
- déterminer si un événement est récurrent ;
- calculer les occurrences ;
- produire les occurrences comprises dans une période.

Les règles de rappel temporel sont séparées dans :

`lib/calendar-reminder-window.ts`

### Finances

Données métier :
- transactions ;
- factures ;
- budgets selon le contexte fonctionnel.

Moteur de calcul :

`lib/finance-engine.ts`

Responsabilités :
- périodes financières ;
- agrégation des transactions ;
- factures en attente ;
- totaux par catégorie ;
- comparaison entre périodes ;
- signaux financiers utilisables par les autres moteurs.

Les interfaces et LOBA doivent consommer ces calculs plutôt que recréer leurs propres définitions financières.

### Attention

Moteur :

`lib/attention-engine.ts`

Le moteur Attention est une couche de sélection et de priorisation.

Il agrège des candidats issus notamment :
- des tâches ;
- du calendrier ;
- des finances ;
- des courses ;
- des insights DABO.

Il ne constitue pas une nouvelle source de vérité pour ces domaines.

Le cycle de vie des signaux d'attention est géré séparément par :

`lib/household-attention-lifecycle.ts`

### Bilan du foyer

Chaîne canonique :

`task_contributions`
→ `computeContributionMemberPoints()`
→ `computeHouseholdInsights()`
→ interprétations de présentation.

`lib/household-weekly-report.ts`
utilise également la primitive canonique de contribution pour construire le bilan hebdomadaire.

`lib/household-recognition.ts`
consomme les résultats du bilan et des insights.

`lib/household-intelligent-summary.ts`
consomme le bilan, les insights et la reconnaissance.

Ces couches ne doivent pas reconstruire une autre mesure de contribution.

### Suggestions d'action du foyer

`lib/household-action-suggestions.ts`

Cette couche transforme le contexte et le bilan existants en proposition d'action.

Elle ne définit pas elle-même la vérité sur la répartition de la charge.

### Intelligence Aujourd'hui

`lib/today-household-intelligence.ts`

Cette couche combine des informations déjà calculées, notamment Attention et les insights du foyer, afin de produire une information pertinente pour Aujourd'hui.

Elle est une couche d'orchestration et non une nouvelle source de vérité métier.

### Notifications

Politique canonique :

`lib/notification-policy.ts`

Responsabilités :
- transformer les événements métier éligibles en candidats de notification ;
- appliquer les règles de notification ;
- construire le digest quotidien.

`lib/notifications.ts`
gère la couche technique d'activation et d'envoi.

Une notification représente un événement dérivé d'une donnée métier ; elle ne devient jamais la source de vérité de cette donnée.

### LOBA

LOBA est une couche d'assistance et d'orchestration.

Principaux composants :
- `lib/loba-household-ai.ts`
- `lib/loba-household-context-router.ts`
- `lib/loba-household-actions.ts`
- `lib/loba-ai.ts`

LOBA peut :
- lire le contexte autorisé ;
- expliquer les données ;
- préparer des actions ;
- router une demande vers le bon domaine.

LOBA ne doit pas créer une définition concurrente de la charge, des finances, des tâches, des courses ou du calendrier.

Lorsque LOBA raisonne sur l'équilibre du foyer, les données fournies doivent provenir des primitives canoniques de contribution.

## 8. Hiérarchie architecturale

Lorsqu'une information traverse DABO, respecter cette hiérarchie :

1. **Donnée persistée**
   La donnée métier enregistrée.

2. **Primitive canonique**
   Le calcul de référence appliqué à cette donnée.

3. **Moteur métier**
   L'interprétation déterministe d'un domaine.

4. **Orchestration**
   Attention, Aujourd'hui, LOBA ou une autre couche combinant plusieurs résultats.

5. **Présentation**
   L'interface affiche le résultat sans redéfinir la logique métier.

Une couche située plus haut ne doit pas recréer une logique déjà définie plus bas.

## 9. Contrat d'évolution

Toute évolution importante doit répondre à ces questions avant implémentation :

- Quelle est la donnée source ?
- Existe-t-il déjà une primitive canonique ?
- Quel moteur possède cette responsabilité ?
- Le nouveau code calcule-t-il quelque chose qui existe déjà ailleurs ?
- L'interface contient-elle une logique métier qui devrait appartenir à `lib/` ?
- LOBA ou Attention utilisent-ils une donnée dérivée plutôt que sa source canonique ?
- Les tests protègent-ils le contrat métier ?

Si une nouvelle source de vérité est introduite, ce document doit être mis à jour dans le même changement.

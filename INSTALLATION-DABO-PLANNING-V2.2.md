# DABO Planning V2.2 — audit terrain

Patch consolidé construit après validation réelle de Planning V2.1 sur mobile et desktop.

## Corrigé
- Timeline : colonne horaire élargie et responsive pour éviter les collisions de `Journée`, `18:00`, etc.
- Le compteur `À organiser aujourd’hui` ne compte plus les événements ni les tâches déjà planifiées. Il représente les tâches non placées, échéances Finance et préparations encore sans responsable.
- Semaine : vraie lecture sur 7 jours, avec horaires des tâches planifiées, événements et échéances.
- Mois : l’heure d’une tâche planifiée est conservée dans le détail du jour.
- Préparations : complétion avec feedback, Annuler/restaurer et accès aux préparations terminées.
- Préparations : échéance et heure facultatives via divulgation progressive.

## Préservé
- Correctif anti-duplication des occurrences.
- Scopes Tout / Moi / Foyer.
- Calcul automatique de fin de créneau selon la durée de tâche.
- Événements, rappels, récurrences et confidentialité.
- Navigation DABO V2 et identité premium.

## Base de données
Aucune nouvelle migration : V2.2 exploite les colonnes `due_date`, `due_time` et `status` déjà présentes dans `calendar_event_responsibilities` depuis V2.1.

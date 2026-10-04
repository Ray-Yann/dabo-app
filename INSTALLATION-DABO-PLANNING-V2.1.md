# DABO Planning V2.1 — Temps + responsabilités + préparation

Cette évolution transforme la vue Jour en véritable emploi du temps du foyer tout en conservant les événements, rappels, récurrences, confidentialité et vues Semaine/Mois existantes.

## Ajouts
- journée navigable date par date avec timeline premium ;
- événements avec heure de début et de fin ;
- tâches datées pouvant être placées dans un vrai créneau horaire ;
- calcul automatique de fin à partir de la durée DABO de la tâche ;
- tâches non placées regroupées dans « À placer dans la journée » ;
- préparation facultative d'un événement avec responsable ou état « À décider » ;
- responsabilités visibles directement sous l'événement ;
- mois enrichi avec tâches et factures, sans transformer la grille en liste illisible ;
- correction sémantique de Moi / Foyer : Foyer ne signifie plus « tout le monde sauf moi » ;
- RLS pour les deux nouveaux objets Planning ;
- 7 langues complètes.

## Base de données
Appliquer `supabase/migrations/2026-10-04-planning-v2-1.sql` avant de déployer le code. La migration est additive : elle ne supprime aucune donnée existante.

## Philosophie
DABO reste simple au premier niveau : un événement peut toujours être créé avec un nom et une date. La profondeur (heure de fin, préparation, responsable, placement d'une tâche) n'apparaît que lorsqu'elle est utile. DABO prépare et coordonne ; il ne réorganise pas silencieusement la vie du foyer.

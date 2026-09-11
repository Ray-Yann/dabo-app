# DABO — Calendrier V2

Base : `dabo-app-PROPRE-20260911-222415.zip`

## Installation
Copier le contenu de ce dossier à la racine de `dabo-app` et accepter le remplacement des fichiers.

## Ce lot ajoute
- choix explicite **Foyer / Personnel** à la création d'un événement ;
- confidentialité personnelle conservée par les RLS déjà en place ;
- vue **Mois** réunissant les événements du foyer et les événements personnels de l'utilisateur courant ;
- légende visuelle Foyer / Personnel ;
- navigation mois précédent / suivant et retour à aujourd'hui ;
- navigation mensuelle correcte pour les événements passés et les récurrences annuelles ;
- 10 nouvelles clés traduites réellement dans les 7 langues DABO ;
- 5 tests de non-régression Calendrier V2.

## Ce lot ne fait pas
- aucun nouveau droit de partage complexe ;
- aucun événement ciblé sur certains membres seulement ;
- aucune synchronisation Google/Apple/Outlook ;
- aucune migration Supabase : le modèle Foyer/Personnel et les RLS existent déjà.

## Validation
```powershell
npm run verify
```

Attendu : 210/210 tests, 616 clés × 7 langues, TypeScript PASS, build PASS 29/29.

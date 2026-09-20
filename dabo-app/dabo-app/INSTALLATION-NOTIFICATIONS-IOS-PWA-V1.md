# DABO — Notifications iOS PWA V1

Correctif ciblé pour l'activation des notifications sur iPhone/iPad.

- Détecte iOS/iPadOS, y compris iPadOS en mode desktop.
- Détecte si DABO est ouvert comme web app depuis l'écran d'accueil.
- Dans Safari iOS non installé, n'appelle pas `Notification.requestPermission()` et explique le prérequis "Ajouter à l'écran d'accueil".
- Une fois DABO ouvert depuis son icône, conserve le flux push existant et la vérification Supabase.
- Ajoute les textes dans les 7 langues actives.
- Aucune migration SQL.

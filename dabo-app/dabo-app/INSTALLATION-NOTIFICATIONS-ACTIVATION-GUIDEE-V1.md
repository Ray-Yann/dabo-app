# DABO — Notifications Activation guidée V1

Correctif minimal :
- affiche sur Aujourd’hui une proposition contextuelle Activer / Plus tard / Non merci pour un appareil sans abonnement Push vérifié ;
- Plus tard repropose après 24 h ; un premier Non merci après 7 jours ; un second refus arrête les relances ;
- une désactivation volontaire depuis Réglages arrête aussi les relances ;
- considère les notifications « Activées » uniquement si la permission navigateur, l’abonnement Push du terminal ET la ligne Supabase du membre correspondent ;
- refuse silencieusement de déclarer une activation réussie si l’upsert Supabase n’a pas réellement persisté l’abonnement ;
- ajoute les 5 nouvelles chaînes dans les 7 catalogues DABO et les tests de non-régression.

Aucune migration SQL n’est nécessaire.

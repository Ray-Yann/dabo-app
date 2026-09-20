# DABO — Calendrier avancé V1.1

## Ce patch corrige
- rappels push liés à l'heure réelle de l'événement/rappel ;
- récurrences et délais J0/J-1/J-2/J-3/J-7/J-14 ;
- fuseau horaire enregistré au moment de la création/modification ;
- anti-doublon serveur par occurrence/membre/délai ;
- `calendar_every_day` dans les 7 langues ;
- bouton « Ajouter le rappel » quand le type Rappel est sélectionné.

## Important
La route `/api/calendar-reminders` doit être appelée chaque minute par **Supabase Cron**. Ne pas ajouter un cron chaque-minute à `vercel.json` sur Vercel Hobby. La configuration du Cron Supabase est une étape de déploiement séparée afin que `CRON_SECRET` ne soit jamais commité dans Git.

## Ordre de déploiement
1. Copier ce patch dans le projet.
2. `npm run verify`.
3. Appliquer `supabase/migrations/20260918_calendar_reminders_v11.sql` dans Supabase.
4. Commit/push et attendre Vercel Ready.
5. Configurer Supabase Cron pour appeler `/api/calendar-reminders` chaque minute avec `Authorization: Bearer <CRON_SECRET>`.
6. Faire un test réel avec une heure future de quelques minutes.

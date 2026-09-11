# DABO UX Light V1.1 — Courses, Tâches et Calendrier

Copier le contenu du patch à la racine du projet DABO en remplaçant les fichiers existants.

Aucune migration Supabase.

Puis lancer :

```powershell
npm run verify
```

Cible : tests + i18n 606 clés × 7 + TypeScript + build PASS.

Changements :
- Courses : À acheter / Suggestions / Historique, une seule vue à la fois ; Promos retiré de Courses.
- Tâches : À faire / Routines / Terminées, une seule vue à la fois.
- Calendrier : À venir / Mois / Personnel avec calendrier mensuel compact.
- Aujourd’hui : Budget devient Finances dans la vue rapide.
- Aucun changement de schéma, moteur métier ou données.

# DABO Finance — Navigation entre les périodes

Ajoute des flèches précédent/suivant dans Budget pour naviguer dans le temps selon la granularité choisie : semaine, mois, trimestre, semestre ou année.

Le bouton central affiche la période consultée et permet de revenir à aujourd'hui.

Exemples :
- Mois : septembre 2026 → octobre 2026
- Année : 2026 → 2027
- Trimestre : T3 2026 → T4 2026

Les métriques, dépenses et factures utilisent la période réellement affichée. Les repères mensuels utilisent le mois correspondant à l'ancre de navigation.

Installation : copier le contenu à la racine du projet, puis lancer `npm run verify`.
Aucune migration Supabase n'est nécessaire.

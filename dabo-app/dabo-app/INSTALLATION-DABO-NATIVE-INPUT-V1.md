# DABO — Native Input V1

Objectif : rendre la saisie Tâches/Courses aussi proche que possible d'un champ natif normal sur iPhone/iPad.

- Retire SmartNameInput de Tâches et Courses.
- Aucun dictionnaire DABO ni menu de mots pendant la frappe.
- Le clavier du terminal garde autocorrection, prédiction et capitalisation.
- Chaque frappe ne met plus à jour la grosse page parente.
- Le nom est synchronisé avec le formulaire lorsque le champ perd le focus.
- Retire les lectures croisées Tâches↔Courses qui ne servaient qu'aux suggestions de mots.
- Aucune migration Supabase.
- Aucune dépendance.

Copier `app`, `components` et `tests` à la racine de dabo-app, puis lancer `npm run verify`.

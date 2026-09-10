# DABO Finance V1.1 — Modification subtile des dépenses

Base : dabo-app-PROPRE-20260910-224227.zip

## Ce lot ajoute
- une petite icône crayon discrète à droite de chaque dépense ;
- au clic, le formulaire existant se réouvre prérempli ;
- modification possible du libellé, montant, catégorie, date et payeur ;
- la dépense existante est mise à jour : elle n'est pas supprimée/recréée ;
- les agrégats Finance sont rechargés après enregistrement ;
- aucune modification des factures, repères, Courses, LOBA ou RLS ;
- aucune migration Supabase.

## Validation
Les 3 tests ciblés Finance V1.1 passent dans l'environnement de préparation.

Après copie du ZIP à la racine du projet :

```powershell
npm run verify
```

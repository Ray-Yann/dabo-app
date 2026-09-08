# DABO — Saisie intelligente V2

Décompresser ce ZIP directement à la racine de `dabo-app` et accepter le remplacement des fichiers.

Puis lancer :

```powershell
npm run verify
```

## Ce que V2 ajoute

- autocomplétion générale dans la langue active de DABO : français, néerlandais ou anglais ;
- dictionnaires chargés à la demande dès que la saisie comporte au moins 2 caractères ;
- priorité au vocabulaire déjà utilisé par le foyer ;
- vocabulaire Courses et Tâches séparé ;
- aucune correction imposée : une suggestion n'est appliquée que si l'utilisateur la sélectionne ;
- architecture extensible à de nouvelles langues.

Si le dictionnaire externe est momentanément indisponible, DABO continue de proposer le vocabulaire du foyer et les termes essentiels intégrés.

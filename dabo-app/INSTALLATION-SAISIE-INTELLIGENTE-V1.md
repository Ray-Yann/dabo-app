# DABO — Saisie intelligente V1

Décompresser le contenu de ce ZIP directement à la racine de `dabo-app` et accepter le remplacement des fichiers.

Puis lancer :

```powershell
npm run verify
```

Aucune migration Supabase et aucune nouvelle variable d'environnement ne sont nécessaires.

## Comportement
- suggestions dès les premières lettres ;
- priorité aux mots déjà utilisés par le foyer dans Tâches ou Courses ;
- petit vocabulaire de départ FR/NL/EN pour les termes courants ;
- accents et majuscules n'empêchent pas la recherche ;
- aucune autocorrection : l'utilisateur reste libre de conserver exactement ce qu'il saisit ;
- un terme propre au foyer, par exemple `Ndolè`, est reproposé tant qu'il existe dans l'historique Tâches/Courses du foyer.

# DABO — LOBA Context Router V1

Correctif ciblé du payload Groq 413 `Payload Too Large`.

## Ce que fait ce lot
- détecte le domaine utile de la question : Finance, Courses, Tâches, Calendrier, Équilibre ou général ;
- envoie à Groq uniquement un contexte borné et pertinent ;
- conserve le contexte complet côté serveur pour les validations après réponse ;
- ne change ni les RLS Finance, ni les confirmations avant écriture, ni les secrets ;
- conserve le diagnostic fournisseur et ajoute seulement le domaine + la taille du prompt (pas les données du foyer).

## Installation
Copier le contenu du ZIP à la racine de `dabo-app` en acceptant les remplacements, puis lancer :

```powershell
npm run verify
```

Aucune migration Supabase. Aucun nouvel environnement. Aucun package ajouté.

Après déploiement Vercel, tester d'abord :
`Combien avons-nous dépensé ce mois-ci ?`

Le test production, et non Vercel Ready seul, valide la fonctionnalité.

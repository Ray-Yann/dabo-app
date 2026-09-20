# DABO — LOBA Diagnostic Groq V1

## But
Ajouter un diagnostic serveur sûr pour les erreurs du moteur Groq sur LOBA côté foyer, sans modifier les règles Finance/RLS ni exposer de secret ou le contenu du foyer.

## Fichiers
- `app/api/loba/household/route.ts` — remplace le fichier existant.
- `tests/loba-household-provider-diagnostics.test.ts` — nouveau test de non-régression.

## Installation
Copier le contenu de ce ZIP directement à la racine du projet `dabo-app`.

Puis lancer :

```powershell
npm run verify
```

## Supabase
Aucune migration Supabase pour ce correctif.

## Après déploiement
Reproduire une question LOBA, puis consulter Vercel Logs. Les messages attendus sont notamment :
- `[household/loba] Groq provider error`
- `[household/loba] AI request failed`
- `[household/loba] Groq empty response`

Le log ne contient ni `GROQ_API_KEY`, ni la question de l’utilisateur, ni le contexte du foyer.

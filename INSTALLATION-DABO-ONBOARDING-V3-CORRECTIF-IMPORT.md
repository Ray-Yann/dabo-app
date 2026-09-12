# DABO — Onboarding V3 — Correctif import Supabase

Copier le dossier `components` à la racine du projet DABO et accepter le remplacement des deux fichiers.

Ce correctif remplace uniquement l'import inexistant `@/lib/supabase/client` par le module existant `@/lib/supabase-client` dans :
- `components/IntroTip.tsx`
- `components/InviteNudge.tsx`

Aucune migration Supabase à exécuter de nouveau.

Puis lancer :

```powershell
npm run verify
```

Cible : 240/240 tests, 623×7, TypeScript PASS, Build 29/29.

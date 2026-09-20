# DABO — Internationalisation V2.1 · Base européenne complète

Ce lot génère **localement** les 4 catalogues complets via DeepL API Free, depuis les 547 entrées françaises actuelles.

Langues ajoutées: Deutsch (DE), Español (ES), Italiano (IT), Português (PT-PT).

## Ordre strict

1. Copier ce patch à la racine de `dabo-app`.
2. Garder ouverte la fenêtre PowerShell où `DEEPL_API_KEY` est déjà chargée.
3. Lancer:
   `node .\scripts\generate-i18n-europe.mjs`
4. Le script ne modifie le projet qu'une fois les 4 catalogues complets reçus et validés.
5. Résultat attendu: `DE 547/547 · ES 547/547 · IT 547/547 · PT 547/547`.
6. Lancer `npm run verify`.
7. Si tout est PASS, exécuter dans Supabase SQL Editor la migration:
   `supabase-migrations/2026-09-10-internationalisation-v2-1-seven-languages.sql`
8. Commit/push seulement après ces validations.

## Sécurité

- La clé DeepL n'est écrite dans aucun fichier.
- Le script lit uniquement `process.env.DEEPL_API_KEY`.
- Les placeholders `{name}`, `{count}`, etc., ainsi que DABO/LOBA, URLs et e-mails sont protégés pendant la traduction.
- Si une des 4 langues échoue, aucun fichier DABO n'est modifié.

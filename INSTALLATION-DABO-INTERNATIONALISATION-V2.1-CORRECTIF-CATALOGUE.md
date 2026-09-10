# DABO — Internationalisation V2.1 — Correctif catalogue courant

Ce correctif remplace le nombre figé de 547 entrées par le catalogue français réellement présent dans le projet au moment de l’exécution.

Dans le ZIP PROPRE 20260910-154618, le catalogue FR contient actuellement 560 entrées. Le script traduit donc les 560 entrées vers DE, ES, IT et PT (2 240 traductions), puis exige que les 7 catalogues aient exactement le même ensemble de clés.

Aucun fichier métier n’est modifié tant que les quatre traductions ne sont pas entièrement générées et vérifiées.

1. Copier ce patch à la racine de dabo-app en acceptant le remplacement du script/test précédents.
2. Garder la même fenêtre PowerShell avec DEEPL_API_KEY chargée.
3. Lancer : `node .\scripts\generate-i18n-europe.mjs`
4. Ne lancer Supabase qu’après succès complet de la génération et `npm run verify`.

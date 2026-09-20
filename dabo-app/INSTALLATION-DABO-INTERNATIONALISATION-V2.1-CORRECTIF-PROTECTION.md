# Correctif V2.1 — protection DABO / LOBA / placeholders

Ce correctif remplace les éléments protégés par des balises XML auto-fermantes avant l'envoi à DeepL. Ainsi, les termes DABO, LOBA, les placeholders `{...}`, URLs et e-mails ne sont jamais envoyés comme texte traduisible.

1. Copier le contenu du ZIP à la racine de `dabo-app` et accepter le remplacement.
2. Dans la même fenêtre PowerShell où `DEEPL_API_KEY` est chargée, lancer:

```powershell
node .\scripts\generate-i18n-europe.mjs
```

Le script ne modifie toujours aucun fichier du projet tant que les quatre catalogues n'ont pas été générés et validés intégralement.

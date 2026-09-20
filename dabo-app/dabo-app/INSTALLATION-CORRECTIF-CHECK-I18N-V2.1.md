# Correctif check:i18n V2.1

Le vérificateur historique comptait les clés à partir du formatage du fichier source.
Il est remplacé par un contrôle des objets réels FR/NL/EN/DE/ES/IT/PT.

Copier le ZIP à la racine puis :

```powershell
node .\scripts\fix-check-i18n-v2-1.mjs
npm run verify
```

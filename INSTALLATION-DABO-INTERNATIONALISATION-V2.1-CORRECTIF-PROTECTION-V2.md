# DABO — Correctif protection DeepL V2

Ce correctif remplace uniquement `scripts/generate-i18n-europe.mjs`.

Le script protège désormais DABO, LOBA, les placeholders `{...}`, URLs et e-mails avec des balises XML contenant le texte protégé. DeepL reçoit `ignore_tags=x`, donc le contenu de ces balises n'est pas traduit. Le script restaure ensuite strictement les valeurs originales.

Aucune migration Supabase. Aucune modification du projet n'est faite tant que les quatre catalogues DE/ES/IT/PT ne sont pas tous complets et validés.

Commande :

```powershell
node .\scripts\generate-i18n-europe.mjs
```

# DABO — Correctif Internationalisation V2.1 — Protection V3

Ce correctif remplace uniquement `scripts/generate-i18n-europe.mjs`.

## Pourquoi
DeepL peut normaliser ou supprimer les attributs `id` des balises XML. Le précédent script dépendait de ces attributs pour restaurer DABO/LOBA/placeholders.

## Correction
Les éléments protégés sont désormais restaurés **dans leur ordre d'apparition**, sans dépendre d'aucun attribut XML. DABO, LOBA, placeholders, URLs et e-mails ne sont jamais traduits.

## Exécution
Dans la même fenêtre PowerShell où `DEEPL_API_KEY` est chargée :

```powershell
node .\scripts\generate-i18n-europe.mjs
```

Ne lancez pas Supabase et ne committez rien avant validation complète.

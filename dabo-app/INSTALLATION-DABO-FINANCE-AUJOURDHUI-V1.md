# DABO — Finance × Aujourd’hui V1

## Installation
Copier le contenu de ce ZIP directement à la racine de `dabo-app` et accepter le remplacement des fichiers.

## Migration Supabase
Aucune migration Supabase n’est nécessaire pour cette étape.

## Comportement
- Aujourd’hui ne devient pas un tableau Budget permanent.
- Seules les factures `pending` en retard, dues aujourd’hui ou dans les 3 prochains jours sont remontées.
- Au maximum 2 factures financières sont affichées dans « L’essentiel aujourd’hui ».
- Un clic ouvre `Équilibre → Budget`.
- Les factures payées, annulées ou plus lointaines restent silencieuses.
- La lecture reste limitée au foyer actif et aux règles RLS déjà en place.

## Validation
Lancer :

```powershell
npm run verify
```

Puis tester en production sur desktop et mobile avec une facture proche, une facture en retard et une facture plus lointaine.

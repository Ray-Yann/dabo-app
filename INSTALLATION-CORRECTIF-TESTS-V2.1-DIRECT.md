# DABO — Correctif direct des tests Internationalisation V2.1

Ce patch remplace uniquement deux fichiers de tests.

Le précédent test comptait les clés avec une expression régulière ligne par ligne.
Le catalogue FR contient plusieurs clés `weekday_*` sur une même ligne : il en
comptait donc 548 alors que le véritable objet JavaScript en contient 560.

Le nouveau test lit le catalogue comme le générateur DABO lui-même :
- comparaison dynamique avec le catalogue FR courant ;
- mêmes clés dans les 7 langues ;
- aucune valeur vide ;
- placeholders `{...}` strictement préservés ;
- DE/ES/IT/PT attendus `available: true` après V2.1.

Après copie du ZIP à la racine de `dabo-app` :

```powershell
npm run verify
```

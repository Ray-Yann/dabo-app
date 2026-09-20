# LOBA V5 — moteur d’analyse

Cette version remplace le moteur conversationnel V4 par une couche d’analyse déterministe et testée.

## Ce qui change
- croisement de plusieurs KPI dans une même réponse ;
- calcul explicite des ratios compte → foyer et foyers actifs · 30 j ;
- distinction stricte entre comptes/utilisateurs et foyers ;
- LOBA signale les données manquantes au lieu de transformer des métriques incompatibles en faux funnel ;
- réponses dédiées à l’activation, l’activité/rétention, l’acquisition, le partage, les priorités et les limites de mesure ;
- 4 tests automatiques de non-régression LOBA V5.

## Installation
Copier le contenu de ce ZIP à la racine de `dabo-app` en acceptant le remplacement des fichiers existants.

Aucune migration SQL. Aucune nouvelle variable Vercel. Aucun secret.

Puis lancer :

```powershell
npm run verify
```

Le résultat attendu est 18 tests réussis (14 historiques + 4 LOBA V5), puis i18n, TypeScript et build PASS.

## Validation réelle après Vercel Ready
Dans Admin → LOBA Intelligence, demander :

`Analyse le funnel de DABO et dis-moi où nous perdons le plus d'utilisateurs.`

LOBA doit notamment :
1. citer 17/19 comptes rattachés (si les données n’ont pas changé) ;
2. calculer séparément le taux de foyers actifs ;
3. avertir que comptes et foyers ne sont pas des unités directement chaînables ;
4. signaler l’absence de mesure partage → visite → inscription et des cohortes J1/J7/J30.

Les chiffres peuvent naturellement évoluer avec les données de production.

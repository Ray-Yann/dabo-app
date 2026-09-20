# DABO Onboarding V2 — Invitation fluide + premier moment de valeur

Base : dabo-app-PROPRE-20260911-010508.zip

## Ce lot ajoute
- partage d'un vrai lien `/?invite=CODE` depuis Réglages ;
- détection automatique du code quand l'invité ouvre le lien ;
- conservation de l'invitation pendant création/connexion du compte ;
- compatibilité multi-foyers : un utilisateur existant peut accepter le lien sans être renvoyé prématurément vers sa Home ;
- protection contre une adhésion en double au même foyer ;
- après création d'un foyer : écran léger « Ton foyer est prêt » avec partage immédiat ou « Plus tard » ;
- le code reste visible comme solution de secours ;
- foyer neuf : premiers pas Courses + Tâches + Calendrier ;
- le message de démarrage existant est adapté dans les 7 langues.

## Base de données
Aucune migration Supabase.

## Validation de préparation
- 5/5 tests ciblés Onboarding V2 : PASS.
- La validation complète reste à faire dans l'environnement local du projet.

```powershell
npm run verify
```

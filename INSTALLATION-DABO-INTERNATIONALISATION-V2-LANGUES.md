# DABO — Internationalisation V2 · Sélecteur de langue évolutif

## Objectif
Remplacer les boutons FR / NL / EN par un sélecteur de langue unique et créer un registre central capable d'accueillir progressivement de nouvelles traductions.

## Ce lot change
- Réglages : liste déroulante « Langue de l’application ».
- Onboarding : même logique de sélection, avec détection de la langue du terminal parmi les langues réellement disponibles.
- Registre central `lib/languages.ts`.
- FR, NL et EN restent activables car leurs catalogues sont complets.
- DE, ES, IT et PT apparaissent dans Réglages comme prochaines langues, mais restent désactivées tant que leurs 444+ textes n'ont pas été traduits et vérifiés.

## Pourquoi les 4 nouvelles langues ne sont pas encore activées
Afficher une langue comme disponible alors qu'une partie de DABO retomberait en français/anglais serait une régression UX. Le registre est prêt ; le prochain lot peut ajouter les quatre catalogues complets puis les passer à `available: true`.

## Supabase
Aucune migration dans ce lot. La contrainte `members.language` reste volontairement limitée à `fr`, `nl`, `en` tant que les nouveaux catalogues ne sont pas activés.

## Vérification
```powershell
npm run verify
```

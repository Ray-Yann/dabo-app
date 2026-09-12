# DABO — Onboarding V3 · Guide contextuel

Base: dabo-app-PROPRE-20260912-015752.zip

## Installation
1. Copier le contenu du patch à la racine de `dabo-app`.
2. Dans Supabase SQL Editor, exécuter uniquement :
   `supabase-migrations/2026-09-12-onboarding-v3-tutorial-preferences.sql`
3. Lancer `npm run verify`.

## Comportement
- Les aides IntroTip existantes deviennent un guide global désactivable par compte.
- `Plus tard` ferme seulement l'aide locale.
- `Ne plus afficher le tutoriel` désactive le guide sur tous les appareils du compte.
- `Revoir le tutoriel DABO` dans Réglages réactive le guide et remet les étapes locales à zéro sur l'appareil courant.
- Le rappel d'invitation propose `Me montrer`, ouvre Réglages, déroule jusqu'à `Inviter un membre`, ouvre le bloc et le met en évidence.
- Aucun package externe ajouté.

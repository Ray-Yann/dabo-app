# DABO — Beta Onboarding & Resilience V1

Base attendue :
- dabo-app-PROPRE-20260912-080246
- Security Households V1 déjà déployé et validé

## Ce lot corrige
- Authentification / onboarding traduits dans les 7 langues DABO.
- Réinitialisation du mot de passe traduite dans les 7 langues.
- Dernier écran global d'erreur compréhensible dans les 7 langues.
- État local du tutoriel isolé par compte utilisateur.
- « Revoir le tutoriel » ne nettoie que l'état local du compte courant.
- Anciennes routes métier /app/equilibre/... transformées en redirections vers les routes canoniques.
- La vraie page Finances est maintenant portée directement par /app/finances.
- Les erreurs de chargement du foyer ne restent plus silencieuses : écran clair + Réessayer.
- 7 nouveaux tests de non-régression.

## Supabase
AUCUNE migration SQL pour ce lot.

## Installation
Copier le contenu du ZIP à la racine de `dabo-app` et accepter les remplacements.

## Vérification
```powershell
npm run verify
```

Attendu :
- 260/260 tests
- 697 clés × 7 langues
- TypeScript PASS
- Build production PASS

Ne pas Commit/Push avant validation du `npm run verify`.

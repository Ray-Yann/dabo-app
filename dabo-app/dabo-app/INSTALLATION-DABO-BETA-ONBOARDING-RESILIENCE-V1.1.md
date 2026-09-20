# DABO — Beta Onboarding & Resilience V1.1 — Password Recovery

Ce correctif remplace le précédent ZIP V1.1. Il est conçu pour le flux Recovery standard Supabase actuellement utilisé par DABO. Aucun SMTP personnalisé, aucun domaine et aucune migration SQL ne sont nécessaires.

## Installation
1. Ouvrir le dossier local `dabo-app`.
2. Copier les dossiers `app`, `lib` et `tests` de ce patch à la racine du projet.
3. Accepter le remplacement des fichiers existants.
4. Ne rien modifier dans Supabase.

## Vérification
```powershell
npm run verify
```

Attendu :
- 265/265 tests
- 700 clés × 7 langues
- TypeScript PASS
- build production 29/29 PASS

## Ce que V1.1 corrige
- vérifie la session Recovery localement puis auprès du serveur Supabase avant `updateUser` ;
- distingue un mot de passe identique (`same_password`) d'une vraie panne ;
- distingue un mot de passe refusé par la politique de sécurité (`weak_password`) ;
- distingue une session expirée/invalide d'une erreur technique ;
- n'affiche jamais le message brut du fournisseur ;
- ne journalise ni mot de passe ni jeton ; seulement le code et le statut Auth en cas d'échec.

## Test Production après Vercel Ready
Demander un NOUVEAU lien depuis DABO. Ne pas réutiliser un ancien lien.
1. Ouvrir le lien.
2. Choisir un mot de passe réellement différent de l'ancien.
3. Enregistrer.
4. Vérifier le message de succès et le retour à la connexion.
5. Se connecter avec le nouveau mot de passe.

Test complémentaire utile : générer un nouveau lien et essayer volontairement l'ancien mot de passe. DABO doit maintenant expliquer clairement qu'il faut choisir un mot de passe différent, au lieu d'afficher une erreur générique.

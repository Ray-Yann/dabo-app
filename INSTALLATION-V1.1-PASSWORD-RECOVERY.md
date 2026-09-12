# DABO — Beta Onboarding & Resilience V1.1 — Password Recovery

## Pourquoi ce correctif
Le parcours réel Gmail → Safari a montré qu'un lien Supabase `ConfirmationURL`
peut être consommé avant l'utilisateur par une vérification/prélecture d'e-mail.
Supabase documente ce cas.

V1.1 utilise un lien DABO contenant `token_hash` et ne vérifie ce jeton qu'après
une action explicite de l'utilisateur sur la page DABO.

## 1. Copier le patch
Copier le contenu de ce ZIP à la racine de `dabo-app` et accepter les remplacements.

Aucune migration SQL.

## 2. Modifier le template Recovery dans Supabase
Supabase Dashboard → Authentication → Email Templates → Reset password.

Dans le contenu du mail, remplacer le lien utilisant `{{ .ConfirmationURL }}`
par un lien utilisant :

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">
  Reset password
</a>
```

Important :
- conserver `{{ .RedirectTo }}` : DABO fournit déjà `/reset-password`;
- ne pas remettre `{{ .ConfirmationURL }}` dans le bouton principal ;
- enregistrer le template.

Le texte autour du bouton peut rester personnalisé. C'est la cible `href` qui est essentielle.

## 3. Vérifier
```powershell
npm run verify
```

Attendu :
- 265/265 tests
- 700 clés × 7 langues
- TypeScript PASS
- Build production PASS

## 4. Test production après Vercel Ready
Demander un NOUVEAU lien depuis DABO. Les anciens e-mails ne sont pas convertis.

Parcours attendu :
1. Ouvrir le nouvel e-mail.
2. Le lien ouvre DABO.
3. DABO demande une confirmation explicite avant de vérifier le lien.
4. Appuyer sur « Continuer en toute sécurité » (traduit selon la langue).
5. Saisir le nouveau mot de passe.
6. Enregistrer.
7. Revenir à la connexion et se connecter avec le nouveau mot de passe.

En cas de lien invalide, « Demander un nouveau lien » ramène directement
au formulaire Mot de passe oublié.

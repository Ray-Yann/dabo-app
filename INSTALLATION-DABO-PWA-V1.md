# DABO — PWA / installation & mises à jour V1

## Installation
Copier les fichiers du patch à la racine du projet DABO en conservant les chemins.

Aucune migration Supabase. Aucune nouvelle clé i18n.

## Ce que V1 sécurise
- `sw.js` et `manifest.json` ne restent pas bloqués dans un cache HTTP ancien.
- Le service worker est vérifié au démarrage, au retour sur l'app et toutes les heures pendant une longue session.
- Un nouveau worker prend immédiatement le contrôle et provoque au maximum un rechargement contrôlé.
- Les icônes installables restent des fichiers versionnés (`dabo-equilibre-v3-*`).

## Important — icône du lanceur
DABO peut rendre immédiatement disponibles le nouveau manifeste et les nouvelles icônes, mais le moment où l'écran d'accueil / lanceur remplace visuellement l'icône d'une PWA installée reste géré par le système et le navigateur. Pour tout futur changement d'icône, créer une nouvelle génération de noms de fichiers (v4, v5...) et mettre à jour le manifeste + les metadata, plutôt que d'écraser un fichier déjà versionné.

## Vérification
```powershell
npm run verify
```

Cible attendue après ce patch : 225/225 tests, 617 × 7, TypeScript PASS, build 29/29.

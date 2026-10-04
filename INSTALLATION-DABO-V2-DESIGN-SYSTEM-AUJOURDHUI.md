# DABO V2 — Design System + Aujourd’hui V2

## Périmètre

Cette livraison installe la première fondation du redesign validé le 4 octobre 2026.

- Design System V2 : crème chaud, vert forêt, sauge, or discret, grenat urgence.
- Thèmes clair et sombre sémantiques et lisibles.
- Navigation V2 : Aujourd’hui | Planning | + | Mon foyer | Plus.
- + central avec ajouts rapides Tâche, Course, Événement et Finances.
- Nouvelle page Mon foyer, sans migration Supabase.
- Aujourd’hui V2 : hiérarchie éditoriale, budget d’attention, état Jour 1, état calme, état erreur/offline, urgence et surface « DABO prépare ».
- Responsive mobile/desktop, safe areas et reduced motion.
- Nouvelles chaînes traduites dans les 7 catalogues FR/NL/EN/DE/ES/IT/PT.

## Sécurité du patch

Aucune migration Supabase n’est ajoutée. Aucune table n’est supprimée ou modifiée. Les modules existants restent accessibles via Plus et le + universel. L’ancien système de préférences de navigation reste en base mais la navigation V2 n’en dépend plus.

## Validation effectuée dans l’environnement de patch

- `npm run check:i18n` : OK — 1116 clés, parité FR/NL/EN/DE/ES/IT/PT.
- Suite Node : les tests V2 et les tests ne nécessitant pas les paquets incomplets passent. L’environnement de patch ne disposait pas d’une installation npm complète : plusieurs tests métier échouent uniquement sur `ERR_MODULE_NOT_FOUND` pour des dépendances partiellement installées après timeout de `npm ci`.
- `typecheck` / `build` complets doivent donc être exécutés dans l’environnement Windows habituel du projet avec ses dépendances npm complètes avant commit/push.

## Vérification locale requise

Dans PowerShell, à la racine du projet :

```powershell
npm run verify
```

Ne commit/push que si cette commande est verte.

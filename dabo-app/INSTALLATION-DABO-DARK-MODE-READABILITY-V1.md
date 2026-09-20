# DABO — Dark Mode Readability V1

Base : dabo-app-PROPRE-20260911-215451.zip

## Correction
- Corrige le contraste de AttentionCard en mode sombre, notamment la Suggestion de Aujourd'hui.
- Remplace les pseudo-variantes `dabo-dark:` (non déclarées comme variante Tailwind) par des classes DABO explicites.
- Lie surface, bordure et couleur d'accent pour les quatre niveaux d'attention.
- Conserve `text-ink` et `text-muted`, déjà pilotés par le thème DABO.
- Aucun changement de données, aucune migration Supabase, aucune nouvelle traduction.

## Validation
Lancer `npm run verify`, puis vérifier en production Aujourd'hui et les autres pages en mode sombre.

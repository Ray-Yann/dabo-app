# DABO V2 — Foyer Solo V1

Ajoute `solo` comme quatrième type de foyer réel, au même niveau que Couple, Famille et Colocation.

- Sélection Solo dans l'onboarding, Réglages et la création d'un foyer supplémentaire.
- Message SMART basé sur Eurostat / EU-LFS 2025 : 37,5 % des foyers de l'UE sont des adultes seuls sans enfant, soit 76,1 millions de foyers.
- Lien direct vers la publication Eurostat du 13 mai 2026.
- Après création, un foyer Solo entre directement dans DABO au lieu d'être poussé à inviter quelqu'un.
- Le tutoriel d'invitation reste silencieux pour les foyers Solo.
- Les moteurs Équilibre / Suggestions / Évolution avaient déjà des gardes `< 2 membres` : aucune fausse redistribution n'est générée pour une personne seule.
- Type et libellés disponibles dans les 7 langues DABO.
- Migration SQL requise : `supabase/migrations/20260917_household_solo_v1.sql`.

Après copie et application de la migration : `npm run verify`.

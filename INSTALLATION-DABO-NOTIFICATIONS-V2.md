# DABO Notifications & Rappels V2 — Rappels intelligents

Base : dabo-app-PROPRE-20260911-005245.zip

## Périmètre
- Tâches : rappel le jour J puis uniquement à des jalons de retard utiles (J+1, J+3, J+7, J+14, J+30).
- Factures : rappel à J-3, le jour J, puis J+1, J+3, J+7, J+14, J+30 si toujours impayée.
- Calendrier : respecte le rappel configuré et le jour de l'événement.
- Confidentialité :
  - tâche -> membre assigné uniquement ;
  - événement personnel -> propriétaire uniquement ;
  - événement foyer -> membres actifs du foyer ;
  - facture privée -> propriétaire uniquement ;
  - facture foyer -> membres actifs du foyer.
- Maximum un digest Cron par membre et par jour.
- Si toutes les alertes concernent le même domaine, le clic ouvre directement Tâches, Calendrier ou Budget.
- Si plusieurs domaines sont concernés, le clic ouvre Aujourd'hui.
- Courses et Équilibre ne sont pas ajoutés au Cron intelligent V2.
- Les notifications immédiates existantes liées aux actions utilisateur restent inchangées.

## Migration Supabase obligatoire
Exécuter UNE SEULE FOIS :
`supabase-migrations/2026-09-11-notifications-v2-dedup.sql`

Ne pas exécuter `supabase-schema.sql`.

Cette migration crée uniquement `notification_deliveries`, une table technique anti-doublon protégée par RLS et utilisée par le Cron service-role.

## Traductions
7 nouvelles clés, traduites dans FR/NL/EN/DE/ES/IT/PT.
Catalogue attendu après installation : 569 clés par langue.

## Validation locale de préparation
- 140/140 tests Node : PASS
- 6/6 tests Notifications V2 : PASS
- i18n : 569 clés, parité et placeholders : PASS
- La validation TypeScript/build complète doit être relancée dans l'environnement projet du développeur avec ses dépendances locales.

Commande :
```powershell
npm run verify
```

# DABO — Correctif loader tests Context Router V1

Ce correctif remplace uniquement `scripts/register-test-loader.mjs`.

Il conserve les imports TypeScript sans extension (compatibles avec le typecheck/bundler) et apprend au chargeur Node des tests à résoudre les imports relatifs vers le fichier `.ts` réel, de la même manière qu'il le faisait déjà pour les alias `@/`.

Aucune migration Supabase. Aucun changement de `tsconfig.json`.

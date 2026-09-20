# DABO Brand Language V1.1.1 — correctif test historique

Base attendue : Brand Language V1.1 déjà copié dans le projet.

Copier le dossier `tests` à la racine de `dabo-app` et accepter le remplacement du fichier existant.

Ce correctif ne change ni l'interface, ni la logique métier, ni Supabase, ni les traductions. Il adapte uniquement le test historique Home V1.3 afin qu'il continue à contrôler `px-4 py-4` / `px-3 py-3` tout en acceptant la classe `dabo-organic-card` ajoutée à la variante prioritaire par Brand Language V1.1.

Puis exécuter :

```powershell
npm run verify
```

Cible : 194/194 tests, 606 clés × 7 langues, TypeScript PASS, Build PASS.

DABO Maison Vivante V3.3 — finitions UX mobiles

Patch ciblé : modifie uniquement app/globals.css en ajoutant des règles CSS.
- Défilement horizontal : léger fondu sur le bord droit sous 1000px.
- Cartes sur téléphone : espacement plus compact, cibles tactiles de 60px minimum.
- Aucun changement des données Courses : le code existant affiche déjà jusqu'à 3 articles de statut to_buy. Le compteur 4 et l'aperçu d'un seul article nécessitent une analyse distincte des sources.
- Aucun changement des comportements LOBA, Scan, des langues ou de Closed Loop.

Depuis la racine du projet :
powershell -ExecutionPolicy Bypass -File .\INSTALLER-DABO-V3.3.ps1
Puis : npm run verify
Ne commitez que app/globals.css après validation visuelle.

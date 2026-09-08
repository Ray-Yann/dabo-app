# DABO — UX Lisibilité V1

Correctif issu des retours foyers :
- navigation basse nettement plus lisible ;
- onglet actif affiché en vert DABO avec texte/icône contrastés ;
- onglets inactifs plus foncés qu'avant ;
- icônes légèrement agrandies ;
- petites tailles de texte relevées dans l'application foyer ;
- zones tactiles de navigation plus confortables ;
- `aria-current="page"` ajouté à l'onglet actif.

Le Cockpit Admin n'est pas modifié par ce correctif.

## Installation
Copier le contenu du ZIP à la racine du projet `dabo-app` en acceptant le remplacement des 2 fichiers :
- `app/app/layout.tsx`
- `app/globals.css`

Puis lancer :

```powershell
npm run verify
```

Si tout est PASS, commit/push avec GitHub Desktop puis attendre Vercel Ready.

## Validation réelle après Vercel Ready
Sur DABO en production :
1. ouvrir plusieurs onglets du bas ;
2. vérifier que l'onglet actif est immédiatement identifiable en vert DABO ;
3. vérifier que les cinq autres onglets restent clairement lisibles ;
4. regarder Courses, Tâches, Calendrier et Réglages et confirmer que les petits textes sont plus confortables ;
5. faire aussi un contrôle rapide sur téléphone si possible.

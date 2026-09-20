# DABO — Internationalisation V1.1 — Catalogue mondial des enseignes

Aucune migration Supabase supplémentaire.

Ce lot complète V1 avec des suggestions d'enseignes par pays. DABO interroge côté serveur le catalogue mondial OpenStreetMap Name Suggestion Index (NSI), mis en cache 24 h, puis le fusionne avec le catalogue communautaire DABO et les magasins propres au foyer.

Des compléments vérifiés sont fournis pour CM, DE, CA et JP afin de sécuriser les tests de production initiaux. Si NSI est temporairement indisponible, Courses continue de fonctionner avec les données DABO existantes et « Autre magasin… ».

Installation : copier le contenu du patch à la racine du projet puis lancer `npm run verify`.

# LOBA IA V1 — moteur conversationnel réel à 0 € pour le prototype

## Ce que ce correctif change

LOBA conserve son moteur analytique déterministe pour les chiffres DABO, mais le champ « Parler à LOBA » appelle désormais un véritable modèle de langage via une route serveur protégée.

- Fournisseur V1 : GroqCloud
- Modèle par défaut : `openai/gpt-oss-120b`
- Clé API : uniquement côté serveur (`GROQ_API_KEY`)
- Aucun nouveau package npm
- Aucun SQL
- Si l'IA n'est pas configurée ou indisponible, LOBA retombe explicitement sur son moteur analytique local au lieu de faire semblant.

## Variables Vercel

Ajouter dans Vercel > Project Settings > Environment Variables :

- `GROQ_API_KEY` = votre clé Groq
- optionnel : `LOBA_AI_MODEL` = `openai/gpt-oss-120b`

Ne jamais mettre la clé dans le code, GitHub ou une variable `NEXT_PUBLIC_*`.

Après ajout/modification d'une variable d'environnement, redéployer DABO.

## Validation

1. `npm run verify`
2. Déployer sur Vercel.
3. Ouvrir Admin > LOBA Intelligence.
4. Poser exactement : « Factures & Budget : tu m'as proposé cette idée. Qu'est-ce que tu veux dire ? »
5. Une vraie réponse IA doit expliquer l'idée au lieu de renvoyer le menu générique.
6. La réponse IA affiche la mention « Réponse IA · données DABO ancrées ».

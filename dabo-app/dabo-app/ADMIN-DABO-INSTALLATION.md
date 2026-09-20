# DABO — Interface administrateur V1

## Installation
Copier les fichiers du correctif en conservant les dossiers.

## Autoriser l'administrateur
Dans Vercel > Project > Settings > Environment Variables, créer une variable serveur :

- Nom : `DABO_ADMIN_EMAILS`
- Valeur : l'adresse e-mail de ton compte DABO
- Environnements : Production et Preview
- Type : Secret (ne pas utiliser de préfixe NEXT_PUBLIC_)

Pour plusieurs administrateurs, séparer les e-mails par une virgule.

Redéployer ensuite l'application. L'interface est disponible sur `/admin`.

## Sécurité
- `/admin` exige une session DABO valide.
- L'API vérifie ensuite l'identité côté serveur et compare l'e-mail à `DABO_ADMIN_EMAILS`.
- `SUPABASE_SERVICE_ROLE_KEY` reste exclusivement côté serveur.
- Aucun secret n'est inclus dans ce correctif.

## KPI V1
Les KPI affichés sont calculés à partir des tables DABO existantes. Aucun événement analytics supplémentaire ni migration SQL n'est requis pour cette V1.

Les KPI de rétention/activation/cohortes ne sont volontairement pas simulés : ils feront l'objet de la V2 Analytics avec définitions stables.

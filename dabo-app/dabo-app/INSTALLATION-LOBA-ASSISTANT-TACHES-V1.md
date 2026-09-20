# DABO — LOBA Assistant × Tâches V1

Ce patch étend le mécanisme sécurisé déjà validé pour les Courses à la création de tâches.

## Ce que LOBA peut faire
- préparer `shopping.add` comme avant ;
- préparer `task.add` uniquement après une demande explicite ;
- résoudre une échéance explicite (ex. demain) ;
- attribuer uniquement à un membre réel du foyer si l'utilisateur le demande ;
- marquer urgente uniquement sur demande explicite ;
- demander une clarification si durée ou effort manquent ;
- attendre obligatoirement le clic **Confirmer** avant toute écriture.

## Ce que LOBA ne peut pas faire dans cette version
- récurrence ;
- modifier, terminer ou supprimer une tâche ;
- inventer durée, effort, responsable ou urgence.

Aucun SQL, package ou secret supplémentaire.

// Ce fichier ne fait que réexporter le vrai contexte partagé, pour que tous
// les écrans qui importaient déjà useHousehold depuis ce chemin continuent
// de fonctionner sans aucune modification.
export { useHousehold } from "./household-context";

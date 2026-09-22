import test from "node:test";
import assert from "node:assert/strict";

import { guardLobaNeverJudge } from "@/lib/loba-never-judge";

test("Never Judge laisse passer une comparaison factuelle de points", () => {
  const result = guardLobaNeverJudge({
    answer: "Ray a 80 points enregistrés et Manga en a 20 sur les 30 derniers jours.",
    domain: "balance",
    memberNames: ["Ray", "Manga"],
    language: "fr",
  });

  assert.equal(result.guarded, false);
  assert.match(result.answer, /80 points/);
});

test("Never Judge bloque un jugement personnel fondé sur les points", () => {
  const result = guardLobaNeverJudge({
    answer: "Ray contribue moins que Manga et devrait en faire davantage.",
    domain: "balance",
    memberNames: ["Ray", "Manga"],
    language: "fr",
  });

  assert.equal(result.guarded, true);
  assert.equal(result.reason, "personal_judgment");
  assert.doesNotMatch(result.answer, /Ray contribue moins/i);
  assert.match(result.answer, /contributions enregistrées/i);
  assert.match(result.answer, /sans juger/i);
});

test("Never Judge bloque une étiquette personnelle", () => {
  const result = guardLobaNeverJudge({
    answer: "Avec seulement 20 points, Manga est plus paresseux que Ray.",
    domain: "balance",
    memberNames: ["Ray", "Manga"],
    language: "fr",
  });

  assert.equal(result.guarded, true);
  assert.doesNotMatch(result.answer, /paresseux/i);
});

test("Never Judge ne touche pas une réponse opérationnelle hors équilibre", () => {
  const answer = "Je peux préparer l'ajout du lait à la liste de courses.";
  const result = guardLobaNeverJudge({
    answer,
    domain: "shopping",
    memberNames: ["Ray", "Manga"],
    language: "fr",
  });

  assert.equal(result.guarded, false);
  assert.equal(result.answer, answer);
});

test("Never Judge ne confond pas une explication de sa propre limite avec un jugement", () => {
  const answer =
    "Je ne peux pas conclure que Manga est paresseux à partir des points enregistrés.";
  const result = guardLobaNeverJudge({
    answer,
    domain: "balance",
    memberNames: ["Ray", "Manga"],
    language: "fr",
  });

  assert.equal(result.guarded, true);
  assert.doesNotMatch(result.answer, /paresseux/i);
  assert.match(result.answer, /ne mesurent pas/i);
});

test("Never Judge fournit un fallback anglais", () => {
  const result = guardLobaNeverJudge({
    answer: "Ray contributes less than Manga and should do more.",
    domain: "balance",
    memberNames: ["Ray", "Manga"],
    language: "en",
  });

  assert.equal(result.guarded, true);
  assert.match(result.answer, /recorded in DABO/i);
  assert.match(result.answer, /without judging/i);
});

test("Never Judge fournit un fallback néerlandais", () => {
  const result = guardLobaNeverJudge({
    answer: "Ray is lazy compared with Manga.",
    domain: "balance",
    memberNames: ["Ray", "Manga"],
    language: "nl",
  });

  assert.equal(result.guarded, true);
  assert.match(result.answer, /DABO/i);
  assert.match(result.answer, /zonder.*beoordelen/i);
});

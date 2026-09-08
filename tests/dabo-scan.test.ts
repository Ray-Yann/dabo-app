import test from "node:test";
import assert from "node:assert/strict";
import { extractScan } from "@/lib/dabo-scan";

test("DABO Scan extrait magasin, date, articles et total d'un ticket", () => {
  const x = extractScan("DELHAIZE\n08/09/2026\nLait 1,89 €\nPain 2,50 €\nTOTAL 4,39 €", "receipt");
  assert.equal(x.merchant, "DELHAIZE");
  assert.equal(x.date, "08/09/2026");
  assert.equal(x.total, "4.39");
  assert.equal(x.lines[0].label, "Lait");
});

test("DABO Scan transforme une liste sans prix en lignes vérifiables", () => {
  const x = extractScan("Lait\nPain\nNdolè\nTomates", "list");
  assert.deepEqual(x.lines.map((l) => l.label), ["Lait", "Pain", "Ndolè", "Tomates"]);
});

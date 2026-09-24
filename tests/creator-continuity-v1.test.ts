import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("lib/supabase-admin.ts", "utf8");

test("le départ d'un créateur vérifie d'abord s'il reste déjà un créateur actif", () => {
  assert.match(
    source,
    /member\.role === "creator"[\s\S]*\.eq\("household_id", member\.household_id\)[\s\S]*\.neq\("id", memberId\)[\s\S]*\.eq\("role", "creator"\)[\s\S]*\.is\("left_at", null\)/
  );
});

test("un successeur n'est recherché que lorsqu'aucun autre créateur actif ne reste", () => {
  assert.match(
    source,
    /if \(!remainingCreator\)[\s\S]*\.order\("created_at", \{ ascending: true \}\)[\s\S]*\.limit\(1\)/
  );
});

test("la primitive expose le membre réellement promu", () => {
  assert.match(
    source,
    /promotedMemberId/
  );
  assert.match(
    source,
    /return \{ promotedMemberId \}/
  );
});

test("l'absence de promotion est représentée explicitement par null", () => {
  assert.match(
    source,
    /let promotedMemberId: string \| null = null/
  );
});

test("le membre sortant est toujours rétrogradé et archivé", () => {
  assert.match(
    source,
    /left_at: new Date\(\)\.toISOString\(\)[\s\S]*user_id: null[\s\S]*role: "member"/
  );
});

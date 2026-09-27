const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("components/IntroTip.tsx", "utf8");

test("IntroTip ne contacte pas Supabase quand DABO demarre hors ligne", () => {
  const loadStart = source.indexOf("async function load()");
  const firstSupabaseCall = source.indexOf("supabase.auth.getUser()", loadStart);

  assert.ok(loadStart >= 0, "la fonction load du tutoriel doit exister");
  assert.ok(firstSupabaseCall > loadStart, "le test doit trouver l'appel Supabase existant");

  const beforeSupabase = source.slice(loadStart, firstSupabaseCall);

  assert.match(
    beforeSupabase,
    /navigator\.onLine/,
    "IntroTip doit verifier le reseau avant son premier appel Supabase"
  );

  assert.match(
    beforeSupabase,
    /setVisible\(false\)/,
    "IntroTip doit rester masque hors ligne"
  );
});

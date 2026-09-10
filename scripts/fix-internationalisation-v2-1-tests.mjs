import fs from "node:fs";

const v2Path = "tests/international-languages-v2.test.ts";
const v21Path = "tests/internationalisation-v2-1-seven-languages.test.ts";

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`Fichier introuvable: ${path}`);
  return fs.readFileSync(path, "utf8");
}
function write(path, text) {
  fs.writeFileSync(path, text, "utf8");
}

let v2 = read(v2Path);
const beforeV2 = v2;

// V2.1 supersedes the old V2 expectation that future languages must remain disabled.
// Keep the historical V2 test meaningful by asserting that the four language entries
// exist in the registry, without imposing their old availability state.
v2 = v2.replace(
  /test\(["']Internationalisation V2 prépare allemand espagnol italien et portugais sans faux support["'][\s\S]*?\n\}\);/,
  `test("Internationalisation V2 prépare allemand espagnol italien et portugais dans le registre central", () => {
  const source = fs.readFileSync("lib/languages.ts", "utf8");
  for (const code of ["de", "es", "it", "pt"]) {
    assert.match(source, new RegExp(\`code: ["']\${code}["']\`));
  }
});`
);

if (v2 === beforeV2) {
  throw new Error("Le test V2 obsolète n'a pas été trouvé; aucun fichier n'a été modifié.");
}

let v21 = read(v21Path);
const beforeV21 = v21;

// Remove stale hard-coded key-count assumptions (e.g. 548) and compare every
// new catalogue to the actual reference catalogue parsed by the test.
v21 = v21.replace(
  /assert\.strictEqual\(\s*keys\.length\s*,\s*\d+\s*,\s*`\$\{lang\} doit avoir \$\{\d+\} entrées`\s*\);/g,
  'assert.strictEqual(keys.length, referenceKeys.length, `${lang} doit avoir ${referenceKeys.length} entrées`);'
);

// Handle the concrete form shown by Node's failing assertion if variable names differ.
v21 = v21.replace(
  /assert\.strictEqual\(\s*[^,\n]+\.length\s*,\s*548\s*,\s*`[^`]*doit avoir 548 entrées`\s*\);/g,
  (m) => {
    const first = m.match(/assert\.strictEqual\(\s*([^,\n]+)\.length/);
    if (!first) return m;
    return `assert.strictEqual(${first[1]}.length, reference.size, \`\${lang} doit avoir \${reference.size} entrées\`);`;
  }
);

// Generic final safety: the V2.1 test must not contain a hard-coded 548 expectation.
if (/\b548\b/.test(v21)) {
  throw new Error("Le test V2.1 contient encore une référence 548. Rien n'a été modifié.");
}
if (v21 === beforeV21) {
  throw new Error("Le test V2.1 n'a pas pu être actualisé. Rien n'a été modifié.");
}

write(v2Path, v2);
write(v21Path, v21);
console.log("✅ Tests Internationalisation V2/V2.1 actualisés.");
console.log("➡️ Lance maintenant: npm run verify");

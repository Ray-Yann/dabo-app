import fs from "node:fs";

const [major] = process.versions.node.split(".").map(Number);
const errors = [];

if (major !== 22) {
  errors.push(`Node.js ${process.versions.node} détecté. DABO attend Node.js 22.x.`);
}

if (!fs.existsSync("package-lock.json")) {
  errors.push("package-lock.json est absent. Utilisez le lockfile pour une installation reproductible avec npm ci.");
}

if (errors.length > 0) {
  console.error("[env] Échec de vérification :");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`[env] OK — Node.js ${process.versions.node}, package-lock.json présent.`);

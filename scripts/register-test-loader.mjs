import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function resolveTypeScriptCandidate(specifier, context) {
  if (specifier.startsWith("@/")) {
    const projectPath = resolve(process.cwd(), specifier.slice(2));
    if (existsSync(projectPath)) return projectPath;
    if (existsSync(`${projectPath}.ts`)) return `${projectPath}.ts`;
    return null;
  }

  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parentPath = fileURLToPath(new URL(".", context.parentURL));
    const candidate = resolve(parentPath, specifier);
    if (existsSync(candidate)) return candidate;
    if (existsSync(`${candidate}.ts`)) return `${candidate}.ts`;
  }

  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolvedPath = resolveTypeScriptCandidate(specifier, context);
    if (resolvedPath) return nextResolve(pathToFileURL(resolvedPath).href, context);
    return nextResolve(specifier, context);
  },
});

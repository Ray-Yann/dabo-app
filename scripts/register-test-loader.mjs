import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

    const projectPath = resolve(process.cwd(), specifier.slice(2));
    const resolvedPath = existsSync(projectPath) ? projectPath : `${projectPath}.ts`;
    return nextResolve(pathToFileURL(resolvedPath).href, context);
  },
});

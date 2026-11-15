import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes("/node_modules/"))
      return next(specifier, context);
    if (specifier.startsWith("@/"))
      specifier = pathToFileURL(`${root}src/${specifier.slice(2)}`).href;
    if (specifier.startsWith(".") || specifier.startsWith("file:")) {
      const url = new URL(specifier, context.parentURL);
      if (
        !/\.[a-z]+$/i.test(url.pathname) &&
        existsSync(`${fileURLToPath(url)}.ts`)
      )
        url.pathname += ".ts";
      return next(url.href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (
      url.startsWith(pathToFileURL(root).href) &&
      !url.includes("/node_modules/") &&
      url.endsWith(".ts")
    )
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            verbatimModuleSyntax: true,
          },
        }).outputText,
      };
    return next(url, context);
  },
});

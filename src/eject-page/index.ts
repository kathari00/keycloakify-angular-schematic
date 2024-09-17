import { normalize } from "@angular-devkit/core";
import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  chain,
  filter,
  mergeWith,
  move,
  strings,
  template,
  url,
} from "@angular-devkit/schematics";
import { parseName } from "@schematics/angular/utility/parse-name";
import {
  buildDefaultPath,
  getWorkspace,
} from "@schematics/angular/utility/workspace";
import { exit } from "process";
import * as ts from "typescript";

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function ejectPage(options: any): Rule {
  return async (tree: Tree, context: SchematicContext): Promise<Rule> => {
    if (options.themeType !== "login") {
      console.error("account not already supported");
      exit(1);
    }

    await setupOptions(tree, options);

    const movePath = normalize(
      options.path + "/" + strings.dasherize(options.themeType) + "/pages"
    );
    console.log(movePath);
    const pageName = options.name
      .replace(".component.ts", "")
      .replace(".ftl", "");

    const templateSource = apply(url(`./files`), [
      filter((path) => path.startsWith(`/${pageName}/${pageName}.component`)),
      template({
        ...options,
        ...strings,
      }),
      move(movePath),
    ]);

    return chain([mergeWith(templateSource), updateLoginRoutes(options)])(
      tree,
      context
    ) as Rule;
  };
}

export async function setupOptions(host: Tree, options: any): Promise<Tree> {
  const workspace = await getWorkspace(host);
  if (!options.project) {
    options.project = Object.keys(workspace.projects)[0];
  }
  const project = workspace.projects.get(options.project);

  if (options.path === undefined && project) {
    options.path = buildDefaultPath(project);
  }

  const parsedPath = parseName(options.path, options.name);
  options.name = parsedPath.name;
  options.path = parsedPath.path;
  return host;
}

function updateLoginRoutes(options: any): Rule {
  return (tree: Tree) => {
    const routingFilePath = normalize(
      options.path +
        "/" +
        strings.dasherize(options.themeType) +
        `/${options.themeType}.routes.ts`
    );

    if (!tree.exists(routingFilePath)) {
      throw new Error(`${options.themeType}.routes.ts not found`);
    }

    const text = tree.read(routingFilePath);
    if (text === null) {
      throw new Error(`${options.themeType}.routes.ts content is empty`);
    }

    const sourceText = text.toString("utf-8");
    let sourceFile = ts.createSourceFile(
      routingFilePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    const recorder = tree.beginUpdate(routingFilePath);

    const pageName = options.name
      .replace(".component.ts", "")
      .replace(".ftl", "");
    // Prepare import and route additions
    const importPath = `./pages/${strings.dasherize(
      pageName
    )}/${strings.dasherize(pageName)}.component`;

    const newRoute = `{
          path: '${strings.dasherize(pageName)}',
          loadComponent: () =>
            import('${importPath}').then((m) => m.${strings.classify(
      pageName
    )}Component),
          data: { doUseDefaultCss: true },
          resolve: { styleSheetResolver }
        },`;

    // Insert import statement at the beginning of the file, if necessary
    if (sourceFile.statements.length === 0) {
      // If the file is empty, just append the import
      recorder.insertLeft(0, 'import { Route } from "@angular/router";\n');
      recorder.insertLeft(
        0,
        'import { styleSheetResolver } from "./common/resolvers/stylesheet.resolver";\n'
      );
    }

    // Add the new route to the routes array
    const routesArrayMatches = sourceText.match(/children:\s*\[\s*/);

    if (routesArrayMatches && routesArrayMatches.index !== undefined) {
      const position = routesArrayMatches.index + routesArrayMatches[0].length;
      recorder.insertRight(position, `\n        ${newRoute}`);
    }

    tree.commitUpdate(recorder);
    return tree;
  };
}

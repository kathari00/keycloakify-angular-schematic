import {
  apply,
  chain,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  template,
  Tree,
  url,
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import * as ts from 'typescript';

export function createPage(options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const targetPath = `src/keycloak-theme/login/pages`;

    const templateSource = apply(url('./files'), [
      template({
        ...options,
        ...strings,
      }),
      move(targetPath),
    ]);

    return chain([
      mergeWith(templateSource),
      updateLoginRoutes(options),
    ])(tree, _context);
  };
}

function updateLoginRoutes(options: any): Rule {
  return (tree: Tree) => {
    const routingFilePath = 'src/keycloak-theme/login/login.routes.ts';

    if (!tree.exists(routingFilePath)) {
      throw new Error('login.routes.ts not found');
    }

    const text = tree.read(routingFilePath);
    if (text === null) {
      throw new Error('login.routes.ts content is empty');
    }

    const sourceText = text.toString('utf-8');
    let sourceFile = ts.createSourceFile(
      routingFilePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    const recorder = tree.beginUpdate(routingFilePath);

    // Prepare import and route additions
    const importPath = `./pages/${strings.dasherize(options.name)}/${strings.dasherize(options.name)}.component`;
    const newImport = `import { ${strings.classify(options.name)}Component } from '${importPath}';\n`;
    const newRoute = `{
        path: '${strings.dasherize(options.name)}',
        outlet: "login",
        loadComponent: () =>
          import('${importPath}').then((m) => m.${strings.classify(options.name)}Component),
      },`;

    // Insert import statement at the beginning of the file, if necessary
    if (sourceFile.statements.length > 0) {
      const firstStatement = sourceFile.statements[0];
      const position = firstStatement.getFullStart();
      recorder.insertLeft(position, newImport);
    } else {
      // If the file is empty, just append the import
      recorder.insertLeft(0, newImport);
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
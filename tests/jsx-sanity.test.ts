import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");
const suspiciousText = ["===", "=>", "&&", "||", ") :", "? ("];
const interactiveTags = new Set(["button", "input", "select", "textarea", "form", "a"]);

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && path.endsWith(".tsx") ? [path] : [];
  });
}

function tagName(node: ts.JsxTagNameExpression): string {
  return node.getText();
}

function findInvalidButtonChild(node: ts.Node): ts.JsxElement | undefined {
  if (ts.isJsxElement(node)) {
    const name = tagName(node.openingElement.tagName);
    if (/^[A-Z]/.test(name) || interactiveTags.has(name)) return node;
  }
  for (const child of node.getChildren()) {
    const invalid = findInvalidButtonChild(child);
    if (invalid) return invalid;
  }
  return undefined;
}

function findViolations(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations: string[] = [];

  function report(node: ts.Node, message: string): void {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    violations.push(`${relative(process.cwd(), file)}:${line + 1}: ${message}`);
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxText(node) && suspiciousText.some((text) => node.getText().includes(text))) {
      report(node, "texto JSX contiene una expresión sospechosa");
    }
    if (
      ts.isJsxElement(node) &&
      ts.isIdentifier(node.openingElement.tagName) &&
      node.openingElement.tagName.text === "button"
    ) {
      const invalidChild = node.children.map(findInvalidButtonChild).find(Boolean);
      if (invalidChild)
        report(invalidChild, "un botón contiene un componente o elemento interactivo");
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

describe("sanidad JSX", () => {
  it("no imprime expresiones condicionales como texto ni anida controles dentro de botones", () => {
    const violations = collectTsxFiles(sourceRoot).flatMap(findViolations);
    expect(violations).toEqual([]);
  });
});

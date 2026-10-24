import type { Table } from "../../parser/ddlParser";
import type { AttributeClassification } from "../model/types";
import { normalizeName } from "../names";

export type FunctionalDependency = {
  determinant: string[];
  dependent: string[];
};

export type NormalFormIssue = {
  form: "1NF" | "2NF" | "3NF";
  columns: string[];
  message: string;
};

/** La primera forma normal requiere valores atómicos y atributos simples. */
export function checkFirstNormalForm(
  attributes: { name: string; classification: AttributeClassification }[],
): NormalFormIssue[] {
  return attributes
    .filter((attribute) =>
      ["multivalued", "composite", "multivalued-composite"].includes(attribute.classification),
    )
    .map((attribute) => ({
      form: "1NF" as const,
      columns: [attribute.name],
      message: `El atributo ${attribute.name} debe normalizarse antes de cumplir 1FN.`,
    }));
}

/** 2FN falla si una dependencia no clave usa solo una parte de la clave primaria compuesta. */
export function checkSecondNormalForm(
  table: Table,
  functionalDependencies: FunctionalDependency[],
): NormalFormIssue[] {
  if (table.primaryKey.length < 2) return [];
  const key = new Set(table.primaryKey.map(normalizeName));
  const nonKeyColumns = table.columns
    .map((column) => column.name)
    .filter((name) => !key.has(normalizeName(name)));
  return functionalDependencies
    .filter((dependency) => isProperKeySubset(dependency.determinant, key))
    .flatMap((dependency) =>
      dependency.dependent
        .filter((column) =>
          nonKeyColumns.some((name) => normalizeName(name) === normalizeName(column)),
        )
        .map((column) => ({
          form: "2NF" as const,
          columns: [...dependency.determinant, column],
          message: `${column} depende de una parte de la clave primaria compuesta.`,
        })),
    );
}

/** 3FN exige que cada dependencia determine una superclave o un atributo primo. */
export function checkThirdNormalForm(
  table: Table,
  functionalDependencies: FunctionalDependency[],
): NormalFormIssue[] {
  const primeColumns = new Set(
    [table.primaryKey, ...table.uniqueKeys].flatMap((key) => key.map(normalizeName)),
  );
  return functionalDependencies
    .filter((dependency) => !isSuperkey(dependency.determinant, table, functionalDependencies))
    .flatMap((dependency) =>
      dependency.dependent
        .filter((column) => !primeColumns.has(normalizeName(column)))
        .map((column) => ({
          form: "3NF" as const,
          columns: [...dependency.determinant, column],
          message: `${column} depende transitivamente de la clave primaria.`,
        })),
    );
}

export function checkNormalForm(
  table: Table,
  functionalDependencies: FunctionalDependency[],
): NormalFormIssue[] {
  return [
    ...checkSecondNormalForm(table, functionalDependencies),
    ...checkThirdNormalForm(table, functionalDependencies),
  ];
}

function isSuperkey(
  columns: string[],
  table: Table,
  dependencies: FunctionalDependency[],
): boolean {
  const closure = dependencyClosure(columns, dependencies);
  return table.columns.every((column) => closure.has(normalizeName(column.name)));
}

function dependencyClosure(columns: string[], dependencies: FunctionalDependency[]): Set<string> {
  const closure = new Set(columns.map(normalizeName));
  let changed = true;
  while (changed) {
    changed = false;
    for (const dependency of dependencies) {
      if (!dependency.determinant.every((column) => closure.has(normalizeName(column)))) continue;
      for (const column of dependency.dependent) {
        const name = normalizeName(column);
        if (closure.has(name)) continue;
        closure.add(name);
        changed = true;
      }
    }
  }
  return closure;
}

function isProperKeySubset(columns: string[], primaryKey: Set<string>): boolean {
  return (
    columns.length > 0 &&
    columns.length < primaryKey.size &&
    columns.every((column) => primaryKey.has(normalizeName(column)))
  );
}

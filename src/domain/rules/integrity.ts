import type { Table } from "../../parser/ddlParser";
import { normalizeName, sameName } from "../names";

export type IntegrityIssue = {
  code: string;
  message: string;
  table?: string;
};

/** Una tabla debe declarar una clave primaria antes de convertirse en entidad. */
export function checkTableHasPrimaryKey(table: Table): IntegrityIssue[] {
  if (table.primaryKey.length > 0) return [];
  return [
    {
      code: "missing-primary-key",
      message: `La tabla ${table.name} no tiene clave primaria.`,
      table: table.name,
    },
  ];
}

/** Los nombres de columnas dentro de una tabla no distinguen mayúsculas. */
export function checkUniqueColumnNames(table: Table): IntegrityIssue[] {
  const names = table.columns.map((column) => normalizeName(column.name));
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  return [...new Set(duplicates)].map((name) => ({
    code: "duplicate-column-name",
    message: `La columna ${name} está repetida en ${table.name}.`,
    table: table.name,
  }));
}

/** Cada FK debe encontrar su tabla destino en el modelo relacional. */
export function checkForeignKeyTargets(tables: Table[]): IntegrityIssue[] {
  return tables.flatMap((table) =>
    table.foreignKeys
      .filter(
        (foreignKey) => !tables.some((candidate) => sameName(candidate.name, foreignKey.table)),
      )
      .map((foreignKey) => ({
        code: "missing-foreign-key-target",
        message: `La FK de ${table.name} referencia la tabla inexistente ${foreignKey.table}.`,
        table: table.name,
      })),
  );
}

/** Una FK debe referenciar una PK o una clave UNIQUE con columnas y tipos compatibles. */
export function checkForeignKeyCompatibility(tables: Table[]): IntegrityIssue[] {
  return tables.flatMap((table) =>
    table.foreignKeys.flatMap((foreignKey) => {
      const target = tables.find((candidate) => sameName(candidate.name, foreignKey.table));
      if (!target) return [];
      const targetColumns = foreignKey.targetColumns ?? target.primaryKey;
      const isUniqueTarget =
        sameColumns(targetColumns, target.primaryKey) ||
        target.uniqueKeys.some((uniqueKey) => sameColumns(targetColumns, uniqueKey));
      if (!isUniqueTarget) {
        return [
          issue(
            table.name,
            "foreign-key-target-not-unique",
            `La FK de ${table.name} no referencia una PK o UNIQUE de ${target.name}.`,
          ),
        ];
      }
      const sourceTypes = foreignKey.columns.map((name) => findColumn(table, name)?.type);
      const referencedTypes = targetColumns.map((name) => findColumn(target, name)?.type);
      if (
        sourceTypes.length !== referencedTypes.length ||
        sourceTypes.some(
          (type, index) => normalizeType(type) !== normalizeType(referencedTypes[index]),
        )
      ) {
        return [
          issue(
            table.name,
            "foreign-key-type-mismatch",
            `La FK de ${table.name} tiene tipos incompatibles con ${target.name}.`,
          ),
        ];
      }
      return [];
    }),
  );
}

function sameColumns(first: string[], second: string[]): boolean {
  return (
    first.length === second.length &&
    first.every((name) => second.some((item) => sameName(name, item)))
  );
}

function findColumn(table: Table, name: string) {
  return table.columns.find((column) => sameName(column.name, name));
}

function normalizeType(type: string | undefined): string {
  return (type ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function issue(table: string, code: string, message: string): IntegrityIssue {
  return { table, code, message };
}

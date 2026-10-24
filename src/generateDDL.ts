import type { HierarchyRecord } from "./domain/model/types";
import { sameName } from "./domain/names";
import type { CheckConstraint, Column, ForeignKey, Table } from "./parser/ddlParser";

const reservedWords = new Set(
  `all analyse analyze and any array as asc asymmetric authorization binary both case cast check
    collate column constraint create current_user default deferrable desc distinct do else end
    except false fetch for foreign from grant group having in initially intersect into lateral
    leading limit localtime localtimestamp new not null offset old on only or order placing
    primary references returning select session_user some symmetric table then to trailing
    true union unique user using variadic when where window with`.split(/\s+/),
);
function quote(identifier: string): string {
  return /^[a-z_][a-z0-9_$]*$/.test(identifier) && !reservedWords.has(identifier.toLowerCase())
    ? identifier
    : `"${identifier.replace(/"/g, '""')}"`;
}
function quoteValue(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
function uniqueName(base: string, used: Set<string>): string {
  let name = base;
  let suffix = 2;
  while (used.has(name.toLowerCase())) name = `${base}_${suffix++}`;
  used.add(name.toLowerCase());
  return name;
}
function checkColumns(table: Table, check: CheckConstraint): string[] {
  if (check.columns?.length) return check.columns;
  return table.columns
    .filter((column) => {
      const escaped = column.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^\\w])${escaped}([^\\w]|$)`, "i").test(check.expression);
    })
    .map((column) => column.name);
}

export function generateDDL(tables: Table[], hierarchies: HierarchyRecord[] = []): string {
  return applyHierarchyRules(tables, hierarchies)
    .map((table) => {
      const usedNames = new Set<string>();
      const parts = table.columns.map((column) => {
        const nullability = column.nullable && !column.primaryKey ? "" : " NOT NULL";
        return `  ${quote(column.name)} ${column.type}${nullability}`;
      });
      if (table.primaryKey.length) {
        const name = quote(uniqueName(`${table.name}_pk`, usedNames));
        const columns = table.primaryKey.map(quote).join(", ");
        parts.push(`  CONSTRAINT ${name} PRIMARY KEY (${columns})`);
      }
      table.uniqueKeys.forEach((key) => {
        const columns = key.join("_") || "key";
        const name = quote(uniqueName(`${table.name}_${columns}_uk`, usedNames));
        const keyColumns = key.map(quote).join(", ");
        parts.push(`  CONSTRAINT ${name} UNIQUE (${keyColumns})`);
      });
      table.foreignKeys.forEach((foreignKey) => {
        const references = foreignKey.targetColumns?.length
          ? ` (${foreignKey.targetColumns.map(quote).join(", ")})`
          : "";
        const columns = foreignKey.columns.join("_") || "column";
        const deleteAction =
          foreignKey.dependency === "E" || foreignKey.dependency === "ID"
            ? "CASCADE"
            : foreignKey.onDelete;
        const onDelete = deleteAction ? ` ON DELETE ${deleteAction}` : "";
        const name = quote(uniqueName(`${table.name}_${columns}_fk`, usedNames));
        const sourceColumns = foreignKey.columns.map(quote).join(", ");
        const targetTable = quote(foreignKey.table);
        parts.push(
          `  CONSTRAINT ${name} FOREIGN KEY (${sourceColumns}) ` +
            `REFERENCES ${targetTable}${references}${onDelete}`,
        );
      });
      (table.checks ?? [])
        .filter((check) => check.expression.trim())
        .forEach((check, index) => {
          const columns = checkColumns(table, check);
          const base = columns.length
            ? `${table.name}_${columns.join("_")}_check`
            : `${table.name}_check${index ? `_${index + 1}` : ""}`;
          parts.push(
            `  CONSTRAINT ${quote(uniqueName(base, usedNames))} CHECK (${check.expression})`,
          );
        });
      return `CREATE TABLE ${quote(table.name)} (\n${parts.join(",\n")}\n);`;
    })
    .join("\n\n");
}

function applyHierarchyRules(tables: Table[], hierarchies: HierarchyRecord[]): Table[] {
  let result = [...tables];
  for (const hierarchy of hierarchies) {
    const supertype = result.find((table) => sameName(table.name, hierarchy.supertype));
    if (!supertype?.primaryKey.length) continue;
    result = addSubtypeKeys(result, hierarchy, supertype);
    result = addHierarchyConstraints(result, hierarchy, supertype);
  }
  return result;
}

function addSubtypeKeys(tables: Table[], hierarchy: HierarchyRecord, supertype: Table): Table[] {
  const referencedColumns = supertype.primaryKey
    .map((name) => supertype.columns.find((column) => sameName(column.name, name)))
    .filter((column): column is Column => Boolean(column));
  const keyNames = referencedColumns.map((column) => column.name);
  return tables.map((table) => {
    if (!hierarchy.subtypes.some((subtype) => sameName(subtype, table.name))) return table;
    const columns = referencedColumns.map((referenced) =>
      subtypeKeyColumn(table, referenced, supertype),
    );
    const foreignKey = createSubtypeForeignKey(columns, supertype);
    const foreignKeys = replaceHierarchyForeignKey(table.foreignKeys, foreignKey);
    return {
      ...table,
      columns: replaceColumns(table.columns, columns),
      primaryKey: keyNames,
      foreignKeys,
    };
  });
}

function subtypeKeyColumn(table: Table, referenced: Column, supertype: Table): Column {
  const existing = table.columns.find((column) => sameName(column.name, referenced.name));
  return {
    ...(existing ?? { name: referenced.name, unique: false }),
    name: referenced.name,
    type: referenced.type,
    nullable: false,
    primaryKey: true,
    foreignKey: {
      table: supertype.name,
      columns: supertype.primaryKey,
      dependency: "ID",
      onDelete: "CASCADE",
    },
  };
}

function createSubtypeForeignKey(columns: Column[], supertype: Table): ForeignKey {
  return {
    columns: columns.map((column) => column.name),
    table: supertype.name,
    targetColumns: supertype.primaryKey,
    dependency: "ID",
    onDelete: "CASCADE",
  };
}

function replaceHierarchyForeignKey(
  foreignKeys: ForeignKey[],
  replacement: ForeignKey,
): ForeignKey[] {
  const otherKeys = foreignKeys.filter(
    (foreignKey) =>
      !sameName(foreignKey.table, replacement.table) ||
      !sameColumnSet(foreignKey.columns, replacement.columns),
  );
  return [...otherKeys, replacement];
}

function replaceColumns(existing: Column[], replacements: Column[]): Column[] {
  const replacedNames = new Set(replacements.map((column) => column.name.toLowerCase()));
  return [
    ...existing.filter((column) => !replacedNames.has(column.name.toLowerCase())),
    ...replacements,
  ];
}

function addHierarchyConstraints(
  tables: Table[],
  hierarchy: HierarchyRecord,
  supertype: Table,
): Table[] {
  if (!hierarchy.total && !hierarchy.exclusive) return tables;
  return tables.map((table) => {
    if (!sameName(table.name, supertype.name)) return table;
    const additions = hierarchy.exclusive
      ? createDiscriminator(table, hierarchy)
      : createOverlapMarkers(table, hierarchy);
    return {
      ...table,
      columns: [...table.columns, ...additions.columns],
      checks: [...table.checks, ...additions.checks],
    };
  });
}

function createDiscriminator(
  table: Table,
  hierarchy: HierarchyRecord,
): { columns: Column[]; checks: CheckConstraint[] } {
  const name = uniqueColumnName(table.columns, `tipo_${table.name}`);
  const accepted = hierarchy.subtypes.map(quoteValue).join(", ");
  return {
    columns: [{ name, type: "TEXT", nullable: !hierarchy.total, primaryKey: false, unique: false }],
    checks: [{ expression: `${quote(name)} IN (${accepted})`, columns: [name] }],
  };
}

function createOverlapMarkers(
  table: Table,
  hierarchy: HierarchyRecord,
): { columns: Column[]; checks: CheckConstraint[] } {
  const columns = hierarchy.subtypes.map((subtype) => ({
    name: uniqueColumnName(table.columns, `es_${subtype}`),
    type: "BOOLEAN",
    nullable: false,
    primaryKey: false,
    unique: false,
  }));
  const expression = columns.map((column) => quote(column.name)).join(" OR ");
  return {
    columns,
    checks: hierarchy.total ? [{ expression, columns: columns.map((column) => column.name) }] : [],
  };
}

function uniqueColumnName(columns: Column[], requestedName: string): string {
  let name = requestedName;
  let suffix = 2;
  while (columns.some((column) => sameName(column.name, name)))
    name = `${requestedName}_${suffix++}`;
  return name;
}

function sameColumnSet(first: string[], second: string[]): boolean {
  return (
    first.length === second.length &&
    first.every((name) => second.some((column) => sameName(name, column)))
  );
}

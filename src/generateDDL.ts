import type { AttributeMark, HierarchyRecord } from "./domain/model/types";
import { normalizeName, sameName } from "./domain/names";
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

export function buildLogicalTables(
  tables: Table[],
  hierarchies: HierarchyRecord[] = [],
  attributeMarks: Record<string, AttributeMark> = {},
): Table[] {
  const expandedComposites = expandCompositeAttributes(tables, attributeMarks);
  return expandMultivaluedAttributes(
    applyHierarchyRules(expandedComposites, hierarchies),
    attributeMarks,
  );
}

export function generateDDL(
  tables: Table[],
  hierarchies: HierarchyRecord[] = [],
  attributeMarks: Record<string, AttributeMark> = {},
): string {
  return buildLogicalTables(tables, hierarchies, attributeMarks)
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

// Cada multivaluado se separa para conservar todos sus valores y la identidad de su entidad dueña.
function expandMultivaluedAttributes(
  tables: Table[],
  attributeMarks: Record<string, AttributeMark>,
): Table[] {
  const usedTableNames = new Set(tables.map((table) => table.name.toLocaleLowerCase("es")));
  const transformedTables = tables.map((table) => ({ ...table, columns: [...table.columns] }));
  const generatedTables: Table[] = [];

  for (const owner of transformedTables) {
    const markedAttributes = owner.columns.flatMap((column) => {
      const entry = Object.entries(attributeMarks).find(([key]) =>
        sameName(key, `${owner.name}.${column.name}`),
      );
      if (!entry || !["multivalued", "multivalued-composite"].includes(entry[1].kind)) return [];
      return [{ column, mark: entry[1] }];
    });

    for (const { column, mark } of markedAttributes) {
      const keyColumns = owner.primaryKey
        .map((name) => owner.columns.find((candidate) => sameName(candidate.name, name)))
        .filter((candidate): candidate is Column => Boolean(candidate));
      if (!keyColumns.length || keyColumns.length !== owner.primaryKey.length) continue;

      const tableName = uniqueTableName(`${owner.name}_${column.name}`, usedTableNames);
      const columnNames = new Set(keyColumns.map((key) => key.name.toLocaleLowerCase("es")));
      const valueNames =
        mark.kind === "multivalued-composite" && mark.parts.length ? mark.parts : [column.name];
      const valueColumns = valueNames.map((name) => ({
        name: uniqueGeneratedColumnName(name, columnNames),
        type: column.type,
        nullable: false,
        primaryKey: true,
        unique: false,
      }));
      const foreignColumns = keyColumns.map((key) => ({
        name: key.name,
        type: key.type,
        nullable: false,
        primaryKey: true,
        unique: false,
        foreignKey: {
          table: owner.name,
          columns: owner.primaryKey,
          onDelete: "CASCADE" as const,
        },
      }));
      const keyNames = keyColumns.map((key) => key.name);

      owner.columns = owner.columns.filter((candidate) => candidate !== column);
      generatedTables.push({
        name: tableName,
        columns: [...foreignColumns, ...valueColumns],
        primaryKey: [...keyNames, ...valueColumns.map((value) => value.name)],
        uniqueKeys: [],
        foreignKeys: [
          {
            columns: keyNames,
            table: owner.name,
            targetColumns: keyNames,
            onDelete: "CASCADE",
          },
        ],
        checks: [],
      });
    }
  }

  return [...transformedTables, ...generatedTables];
}

// Cada atributo compuesto se convierte en una columna por miniatributo en el modelo lógico.
function expandCompositeAttributes(
  tables: Table[],
  attributeMarks: Record<string, AttributeMark>,
): Table[] {
  const expansions = new Map<string, Map<string, string[]>>();

  for (const table of tables) {
    const compositeColumns = table.columns.flatMap((column) => {
      const mark = findAttributeMark(attributeMarks, table.name, column.name);
      if (mark?.kind !== "composite") return [];
      const parts = mark.parts.map((part) => part.trim()).filter(Boolean);
      return parts.length ? [{ column, parts }] : [];
    });
    const compositeNames = new Set(
      compositeColumns.map(({ column }) => normalizeName(column.name)),
    );
    const usedNames = new Set(
      table.columns
        .filter((column) => !compositeNames.has(normalizeName(column.name)))
        .map((column) => normalizeName(column.name)),
    );
    const tableExpansion = new Map<string, string[]>();

    for (const { column, parts } of compositeColumns) {
      tableExpansion.set(
        normalizeName(column.name),
        parts.map((part) => uniqueGeneratedColumnName(part, usedNames)),
      );
    }
    expansions.set(normalizeName(table.name), tableExpansion);
  }

  return tables.map((table) => {
    const sourceExpansion =
      expansions.get(normalizeName(table.name)) ?? new Map<string, string[]>();
    const columns = table.columns.flatMap((column) => {
      const parts = sourceExpansion.get(normalizeName(column.name));
      if (!parts) return [column];
      return parts.map((name) => ({
        ...column,
        name,
        unique: false,
        alternateKey: false,
        foreignKey: column.foreignKey
          ? {
              ...column.foreignKey,
              columns: expandColumnNames(
                column.foreignKey.columns ?? [column.name],
                expansions.get(normalizeName(column.foreignKey.table)),
              ),
            }
          : undefined,
      }));
    });
    const primaryKey = expandColumnNames(table.primaryKey, sourceExpansion);
    const uniqueKeys = table.uniqueKeys.map((key) => expandColumnNames(key, sourceExpansion));
    const foreignKeys = table.foreignKeys.map((foreignKey) => ({
      ...foreignKey,
      columns: expandColumnNames(foreignKey.columns, sourceExpansion),
      targetColumns: foreignKey.targetColumns
        ? expandColumnNames(
            foreignKey.targetColumns,
            expansions.get(normalizeName(foreignKey.table)),
          )
        : undefined,
    }));
    return { ...table, columns, primaryKey, uniqueKeys, foreignKeys };
  });
}

function findAttributeMark(
  attributeMarks: Record<string, AttributeMark>,
  tableName: string,
  columnName: string,
): AttributeMark | undefined {
  const key = `${tableName}.${columnName}`;
  return Object.entries(attributeMarks).find(([candidate]) => sameName(candidate, key))?.[1];
}

function expandColumnNames(
  names: string[],
  expansion: Map<string, string[]> | undefined,
): string[] {
  return names.flatMap((name) => expansion?.get(normalizeName(name)) ?? [name]);
}

function uniqueTableName(base: string, usedNames: Set<string>): string {
  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate.toLocaleLowerCase("es"))) candidate = `${base}_${suffix++}`;
  usedNames.add(candidate.toLocaleLowerCase("es"));
  return candidate;
}

function uniqueGeneratedColumnName(base: string, usedNames: Set<string>): string {
  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate.toLocaleLowerCase("es"))) candidate = `${base}_${suffix++}`;
  usedNames.add(candidate.toLocaleLowerCase("es"));
  return candidate;
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
  const inheritedNames = new Set(keyNames.map((name) => name.toLowerCase()));
  return tables.map((table) => {
    if (!hierarchy.subtypes.some((subtype) => sameName(subtype, table.name))) return table;
    const columns = referencedColumns.map((referenced) =>
      subtypeKeyColumn(table, referenced, supertype),
    );
    const foreignKey = createSubtypeForeignKey(columns, supertype);
    const foreignKeys = replaceHierarchyForeignKey(table.foreignKeys, foreignKey);
    // La PK propia del subtipo se sustituye por la heredada: deja de ser PK,
    // pero se conserva como atributo propio para no perder información.
    const demoted = table.columns.map((column) =>
      column.primaryKey && !inheritedNames.has(column.name.toLowerCase())
        ? { ...column, primaryKey: false }
        : column,
    );
    return {
      ...table,
      columns: replaceColumns(demoted, columns),
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
  // Solo puede existir una FK de herencia por subtipo: se sustituye la que
  // apunta a la misma clave del supertipo, pero se conservan otras relaciones
  // del subtipo con el supertipo que usen columnas destino distintas.
  const otherKeys = foreignKeys.filter(
    (foreignKey) =>
      !sameName(foreignKey.table, replacement.table) ||
      !sameColumnSet(foreignKey.targetColumns ?? [], replacement.targetColumns ?? []),
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

import type { ParseResult, Table } from "../../parser/ddlParser";
import { normalizeName, sameName } from "../names";
import type { EntityId, HierarchyRecord, RelationshipSnapshot } from "./types";
export type { AttributeMark, RelationDraft } from "./types";
export type Entity = {
  id: EntityId;
  table: Table;
  x: number;
  y: number;
  associative: boolean;
  weak: boolean;
};
export type Relation = RelationshipSnapshot;
export type DiagramModel = {
  entities: Entity[];
  logicalEntities: Entity[];
  relations: Relation[];
  logicalRelations: Relation[];
  warnings: string[];
  hierarchies: HierarchyRecord[];
};
export type Hierarchy = HierarchyRecord;
const sameColumns = (first: string[], second: string[]) =>
  first.length === second.length &&
  first.every((name) => second.some((item) => sameName(name, item)));
function fkUnique(table: Table, cols: string[]): boolean {
  return (
    table.uniqueKeys.some((key) => sameColumns(key, cols)) ||
    (table.primaryKey.length === cols.length && sameColumns(table.primaryKey, cols))
  );
}
function fkNullable(table: Table, cols: string[]): boolean {
  return cols.some(
    (name) => table.columns.find((column) => sameName(column.name, name))?.nullable ?? true,
  );
}
export function toDiagram(parsed: ParseResult, hierarchies: HierarchyRecord[] = []): DiagramModel {
  const referenceCounts = countReferences(parsed.tables);
  const associativeNames = findAssociativeTables(parsed.tables, referenceCounts);
  const entities = createEntities(parsed.tables, associativeNames);
  const logicalRelations = createLogicalRelations(parsed.tables);
  const conceptual = createConceptualRelations(parsed.tables, associativeNames);
  return {
    entities,
    logicalEntities: entities,
    relations: conceptual.relations,
    logicalRelations,
    hierarchies,
    warnings: [
      ...new Set([
        ...parsed.warnings,
        ...parsed.tables
          .filter((table) => table.primaryKey.length === 0)
          .map((table) => `La tabla ${table.name} no tiene clave primaria.`),
        ...conceptual.warnings,
      ]),
    ],
  };
}

function countReferences(tables: Table[]): Map<string, number> {
  const references = new Map<string, number>();
  for (const table of tables) {
    for (const foreignKey of table.foreignKeys) {
      const key = normalizeName(foreignKey.table);
      references.set(key, (references.get(key) ?? 0) + 1);
    }
  }
  return references;
}

function findAssociativeTables(tables: Table[], references: Map<string, number>): Set<string> {
  return new Set(
    tables
      .filter(
        (table) =>
          table.foreignKeys.length >= 2 &&
          table.primaryKey.length > 0 &&
          table.primaryKey.every((primaryKey) =>
            table.foreignKeys.some((foreignKey) =>
              foreignKey.columns.some((column) => sameName(column, primaryKey)),
            ),
          ) &&
          (references.get(normalizeName(table.name)) ?? 0) === 0,
      )
      .map((table) => normalizeName(table.name)),
  );
}

function createEntities(tables: Table[], associativeNames: Set<string>): Entity[] {
  return tables.map((table, index) => ({
    id: `entity:${normalizeName(table.name)}`,
    table,
    x: 200 + (index % 3) * 380,
    y: 180 + Math.floor(index / 3) * 360,
    associative: associativeNames.has(normalizeName(table.name)),
    weak:
      !associativeNames.has(normalizeName(table.name)) &&
      table.foreignKeys.some(
        (foreignKey) => foreignKey.dependency === "E" || foreignKey.dependency === "ID",
      ),
  }));
}

function createLogicalRelations(tables: Table[]): Relation[] {
  return tables.flatMap((table) =>
    table.foreignKeys.flatMap((foreignKey) => {
      const target = tables.find((candidate) => sameName(candidate.name, foreignKey.table));
      return target ? [createLogicalRelation(table, foreignKey, target)] : [];
    }),
  );
}

function createLogicalRelation(
  table: Table,
  foreignKey: Table["foreignKeys"][number],
  target: Table,
): Relation {
  const nullable = fkNullable(table, foreignKey.columns);
  const identifying = foreignKey.columns.every((column) =>
    table.primaryKey.some((primaryKey) => sameName(primaryKey, column)),
  );
  return {
    id: `logical:${normalizeName(table.name)}:${foreignKey.columns.map(normalizeName).join(",")}`,
    name: `${target.name}_${table.name}`,
    left: target.name,
    right: table.name,
    kind: fkUnique(table, foreignKey.columns) ? "1:1" : "1:N",
    attributes: [],
    foreignKeyNullable: nullable,
    identifying,
    dependency: foreignKey.dependency,
  };
}

function createConceptualRelations(tables: Table[], associativeNames: Set<string>) {
  const relations: Relation[] = [];
  const warnings: string[] = [];
  for (const table of tables) {
    if (associativeNames.has(normalizeName(table.name))) {
      const relation = createAssociativeRelation(table);
      if (relation) relations.push(relation);
      continue;
    }
    for (const foreignKey of table.foreignKeys) {
      const target = tables.find((candidate) => sameName(candidate.name, foreignKey.table));
      if (!target) continue;
      const created = createConceptualRelation(table, foreignKey, target);
      relations.push(created.relation);
      if (created.warning) warnings.push(created.warning);
    }
  }
  return { relations, warnings };
}

function createAssociativeRelation(table: Table): Relation | undefined {
  const participants = table.foreignKeys.map((foreignKey) => foreignKey.table);
  if (participants.length < 2) return undefined;
  return {
    id: `assoc:${normalizeName(table.name)}`,
    name: table.foreignKeys[0].relationName ?? table.name,
    left: participants[0],
    right: participants[1],
    participants,
    roles: table.foreignKeys[0].roles,
    participantMaximums: table.foreignKeys[0].participantMaximums,
    kind: "N:M",
    attributes: table.columns
      .filter(
        (column) =>
          !table.foreignKeys.some((foreignKey) =>
            foreignKey.columns.some((name) => sameName(name, column.name)),
          ),
      )
      .map((column) => column.name),
  };
}

function createConceptualRelation(
  table: Table,
  foreignKey: Table["foreignKeys"][number],
  target: Table,
): { relation: Relation; warning?: string } {
  const foreignKeyInPrimaryKey = foreignKey.columns.every((column) =>
    table.primaryKey.some((primaryKey) => sameName(primaryKey, column)),
  );
  const ownsPrimaryKeyPart = table.primaryKey.some(
    (primaryKey) => !foreignKey.columns.some((column) => sameName(column, primaryKey)),
  );
  const nullable = fkNullable(table, foreignKey.columns);
  const dependency = foreignKey.dependency;
  const warning =
    foreignKeyInPrimaryKey && ownsPrimaryKeyPart
      ? `${table.name} tiene una PK mixta de FK y columnas propias; podría ser una entidad ` +
        "débil identificada."
      : undefined;
  return {
    relation: {
      id: `fk:${normalizeName(table.name)}:${foreignKey.columns.map(normalizeName).join(",")}`,
      name: foreignKey.relationName ?? `${target.name}_${table.name}`,
      left: target.name,
      right: table.name,
      kind: relationKind(table, foreignKey),
      attributes: [],
      foreignKeyNullable: nullable,
      identifying: foreignKeyInPrimaryKey,
      dependency,
      weakCardinality: foreignKey.weakCardinality,
      roles: foreignKey.roles,
      participantMaximums: foreignKey.participantMaximums,
    },
    warning,
  };
}

function relationKind(table: Table, foreignKey: Table["foreignKeys"][number]): Relation["kind"] {
  if (!foreignKey.weakCardinality) return fkUnique(table, foreignKey.columns) ? "1:1" : "1:N";
  return foreignKey.weakCardinality.endsWith(":1") ? "1:1" : "1:N";
}

import { failure, success, type Result } from "../Result";
import { normalizeName, sameName } from "../names";
import type { RelationDraft, RelationshipSnapshot } from "../model/types";
import type { WeakCardinality } from "../../parser/ddlParser";
import { deleteEntity } from "./entities";
import type { DomainState, OperationChanges } from "./types";

export type RelationEdit = {
  kind?: RelationDraft["kind"];
  mandatory?: boolean;
  weakCardinality?: WeakCardinality;
};

export function updateRelationRoles(
  state: DomainState,
  id: string,
  roles: [string, string],
): Result<OperationChanges> {
  if (id.startsWith("assoc:")) return updateAssociativeRoles(state, id, roles);
  return updateForeignKeyRoles(state, id, roles);
}

function updateAssociativeRoles(
  state: DomainState,
  id: string,
  roles: [string, string],
): Result<OperationChanges> {
  const tableName = normalizeName(id.slice("assoc:".length));
  const association = state.tables.find((table) => normalizeName(table.name) === tableName);
  if (!association) return failure("relation-not-found", "No se encontró la entidad asociativa.");
  const tables = state.tables.map((table) =>
    normalizeName(table.name) === tableName
      ? { ...table, foreignKeys: table.foreignKeys.map((foreignKey) => ({ ...foreignKey, roles })) }
      : table,
  );
  return success({ tables });
}

function updateForeignKeyRoles(
  state: DomainState,
  id: string,
  roles: [string, string],
): Result<OperationChanges> {
  const match = parseForeignKeyRelationId(id);
  if (!match)
    return failure("invalid-relation-id", "No se reconoce el identificador de la relación.");
  const owner = state.tables.find((table) => normalizeName(table.name) === match.owner);
  if (
    !owner ||
    !owner.foreignKeys.some(
      (foreignKey) => foreignKeyColumnsKey(foreignKey.columns) === match.columns,
    )
  ) {
    return failure("relation-not-found", "No se encontró la clave foránea de la relación.");
  }
  const tables = state.tables.map((table) =>
    normalizeName(table.name) === match.owner
      ? {
          ...table,
          foreignKeys: table.foreignKeys.map((foreignKey) =>
            foreignKeyColumnsKey(foreignKey.columns) === match.columns
              ? { ...foreignKey, roles }
              : foreignKey,
          ),
        }
      : table,
  );
  return success({ tables });
}

export function editRelation(
  state: DomainState,
  relations: RelationshipSnapshot[],
  id: string,
  changes: RelationEdit,
): Result<OperationChanges> {
  const relation = relations.find((item) => item.id === id);
  const match = parseForeignKeyRelationId(id);
  if (!relation || !match || relation.kind === "N:M" || changes.kind === "N:M") {
    return failure("relation-not-editable", "La interrelación no se puede editar en este modelo.");
  }
  const owner = state.tables.find((table) => normalizeName(table.name) === match.owner);
  const foreignKey = owner?.foreignKeys.find(
    (item) => foreignKeyColumnsKey(item.columns) === match.columns,
  );
  if (!owner || !foreignKey)
    return failure("relation-not-found", "No se encontró la clave foránea de la relación.");

  if (changes.weakCardinality && relation.dependency) {
    return editWeakCardinality(state, owner, foreignKey, match.columns, changes.weakCardinality);
  }
  return editBinaryCardinality(state, owner, foreignKey, match.columns, relation.kind, changes);
}

function editWeakCardinality(
  state: DomainState,
  owner: DomainState["tables"][number],
  foreignKey: DomainState["tables"][number]["foreignKeys"][number],
  key: string,
  cardinality: WeakCardinality,
): Result<OperationChanges> {
  const identifying = foreignKey.dependency === "ID";
  const partialIdentifiers =
    foreignKey.partialIdentifiers ??
    (foreignKey.partialIdentifier ? [foreignKey.partialIdentifier] : []);
  const columns = owner.columns.map((column) =>
    foreignKey.columns.some((name) => sameName(name, column.name))
      ? { ...column, nullable: false, primaryKey: identifying }
      : partialIdentifiers.some((name) => sameName(name, column.name))
        ? { ...column, primaryKey: identifying && !cardinality.endsWith(":1") }
        : column,
  );
  const uniqueKeys = owner.uniqueKeys.filter((item) => foreignKeyColumnsKey(item) !== key);
  if (!identifying && cardinality.endsWith(":1")) uniqueKeys.push(foreignKey.columns);
  const foreignKeys = owner.foreignKeys.map((item) => {
    if (item !== foreignKey) return item;
    return { ...item, weakCardinality: cardinality };
  });
  return success({
    tables: replaceTable(state.tables, owner.name, {
      ...owner,
      columns,
      primaryKey: columns.filter((column) => column.primaryKey).map((column) => column.name),
      uniqueKeys,
      foreignKeys,
    }),
  });
}

function editBinaryCardinality(
  state: DomainState,
  owner: DomainState["tables"][number],
  foreignKey: DomainState["tables"][number]["foreignKeys"][number],
  key: string,
  currentKind: RelationDraft["kind"],
  changes: RelationEdit,
): Result<OperationChanges> {
  const nextKind = changes.kind ?? currentKind;
  const uniqueKeys = owner.uniqueKeys.filter((item) => foreignKeyColumnsKey(item) !== key);
  if (nextKind === "1:1") uniqueKeys.push(foreignKey.columns);
  const columns = owner.columns.map((column) =>
    foreignKey.columns.some((name) => sameName(name, column.name))
      ? { ...column, ...(changes.mandatory !== undefined ? { nullable: !changes.mandatory } : {}) }
      : column,
  );
  const relationKey = `fk:${normalizeName(owner.name)}:${foreignKey.columns
    .map(normalizeName)
    .join(",")}`;
  const currentMinimums = state.cardinalityMinimums[relationKey];
  const currentOwnerFirst = currentKind === "N:1";
  const nextOwnerFirst = nextKind === "N:1";
  const flipped = currentOwnerFirst !== nextOwnerFirst;
  const minimums =
    currentMinimums && flipped ? [currentMinimums[1] ?? 1, currentMinimums[0] ?? 1] : undefined;
  const nextForeignKey = {
    ...foreignKey,
    relationKind:
      nextKind === "N:1"
        ? ("N:1" as const)
        : nextKind === "1:1"
          ? ("1:1" as const)
          : ("1:N" as const),
    participantMaximums:
      nextKind === "1:1"
        ? (["1", "1"] as ("1" | "n")[])
        : nextOwnerFirst
          ? (["n", "1"] as ("1" | "n")[])
          : (["1", "n"] as ("1" | "n")[]),
  };
  return success({
    tables: replaceTable(state.tables, owner.name, {
      ...owner,
      columns,
      uniqueKeys,
      foreignKeys: owner.foreignKeys.map((item) => (item === foreignKey ? nextForeignKey : item)),
    }),
    ...(minimums
      ? { cardinalityMinimums: { ...state.cardinalityMinimums, [relationKey]: minimums } }
      : {}),
  });
}

export function deleteRelation(
  state: DomainState,
  relations: RelationshipSnapshot[],
  id: string,
): Result<OperationChanges> {
  const relation = relations.find((item) => item.id === id);
  if (!relation) return failure("relation-not-found", "No se encontró la interrelación.");
  if (relation.dependency && relation.weakCardinality) {
    const changes = deleteEntity(state, relation.right);
    if (!changes.ok) return changes;
    return success({
      ...changes.value,
      names: withoutKey(state.names, id),
      relationAttributes: withoutKey(state.relationAttributes, id),
    });
  }
  if (relation.kind === "N:M") return success(deleteAssociation(state, relation));
  return deleteBinaryRelation(state, id);
}

function deleteAssociation(state: DomainState, relation: RelationshipSnapshot): OperationChanges {
  const tables = state.tables.filter((table) => !sameName(table.name, relation.name));
  const validKeys = new Set(
    tables.flatMap((table) =>
      table.columns.map((column) => `${table.name}.${column.name}`.toLowerCase()),
    ),
  );
  return {
    tables,
    attributeMarks: filterMap(state.attributeMarks, validKeys),
    domains: filterMap(state.domains, validKeys),
    names: withoutKey(state.names, relation.id),
  };
}

function deleteBinaryRelation(state: DomainState, id: string): Result<OperationChanges> {
  const match = parseForeignKeyRelationId(id);
  if (!match)
    return failure("invalid-relation-id", "No se reconoce el identificador de la relación.");
  const owner = state.tables.find((table) => normalizeName(table.name) === match.owner);
  const foreignKey = owner?.foreignKeys.find(
    (item) => foreignKeyColumnsKey(item.columns) === match.columns,
  );
  if (!owner || !foreignKey)
    return failure("relation-not-found", "No se encontró la clave foránea de la relación.");
  const removed = new Set(
    [...foreignKey.columns, ...(state.relationAttributes[id] ?? [])].map(normalizeName),
  );
  const updated = {
    ...owner,
    columns: owner.columns.filter((column) => !removed.has(normalizeName(column.name))),
    primaryKey: owner.primaryKey.filter((column) => !removed.has(normalizeName(column))),
    uniqueKeys: owner.uniqueKeys.filter(
      (key) => !key.some((column) => removed.has(normalizeName(column))),
    ),
    foreignKeys: owner.foreignKeys.filter((item) => item !== foreignKey),
  };
  return success({
    tables: replaceTable(state.tables, owner.name, updated),
    names: withoutKey(state.names, id),
    relationAttributes: withoutKey(state.relationAttributes, id),
  });
}

function parseForeignKeyRelationId(id: string): { owner: string; columns: string } | null {
  const match = id.match(/^fk:([^:]+):(.+)$/);
  return match ? { owner: normalizeName(match[1]), columns: normalizeName(match[2]) } : null;
}

function foreignKeyColumnsKey(columns: string[]): string {
  return columns.map(normalizeName).join(",");
}

function replaceTable(
  tables: DomainState["tables"],
  name: string,
  replacement: DomainState["tables"][number],
) {
  return tables.map((table) => (sameName(table.name, name) ? replacement : table));
}

function withoutKey<Value>(values: Record<string, Value>, key: string): Record<string, Value> {
  const result = { ...values };
  delete result[key];
  return result;
}

function filterMap<Value>(
  values: Record<string, Value>,
  validKeys: Set<string>,
): Record<string, Value> {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => validKeys.has(key.toLowerCase())),
  );
}

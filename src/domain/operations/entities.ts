import { failure, success, type Result } from "../Result";
import { isUniqueName, normalizeName, sameName } from "../names";
import type { DomainState, OperationChanges } from "./types";

export function renameEntity(
  state: DomainState,
  oldName: string,
  requestedName: string,
): Result<OperationChanges> {
  const newName = requestedName.trim();
  if (!newName) return failure("empty-entity-name", "Escribe el nombre de la entidad.");
  if (
    !sameName(oldName, newName) &&
    !isUniqueName(
      newName,
      state.tables.map((table) => table.name),
    )
  ) {
    return failure("duplicate-entity-name", `Ya existe una entidad llamada ${newName}.`);
  }

  const tables = state.tables.map((table) => {
    if (table.name === oldName) return { ...table, name: newName };
    return {
      ...table,
      columns: table.columns.map((column) =>
        column.foreignKey?.table === oldName
          ? { ...column, foreignKey: { ...column.foreignKey, table: newName } }
          : column,
      ),
      foreignKeys: table.foreignKeys.map((foreignKey) =>
        foreignKey.table === oldName ? { ...foreignKey, table: newName } : foreignKey,
      ),
    };
  });
  const changes: OperationChanges = { tables };
  if (oldName !== newName) {
    changes.attributeMarks = renameAttributeMap(state.attributeMarks, oldName, newName);
    changes.domains = renameAttributeMap(state.domains, oldName, newName);
  }
  return success(changes);
}

function renameAttributeMap<Value>(
  values: Record<string, Value>,
  oldName: string,
  newName: string,
): Record<string, Value> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key.startsWith(`${oldName}.`) ? `${newName}.${key.slice(oldName.length + 1)}` : key,
      value,
    ]),
  );
}

export function deleteEntity(state: DomainState, name: string): Result<OperationChanges> {
  const removedNames = new Set([normalizeName(name)]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const table of state.tables) {
      const isDependent = table.foreignKeys.some(
        (foreignKey) =>
          removedNames.has(normalizeName(foreignKey.table)) &&
          Boolean(foreignKey.weakCardinality) &&
          (foreignKey.dependency === "E" || foreignKey.dependency === "ID"),
      );
      if (!removedNames.has(normalizeName(table.name)) && isDependent) {
        removedNames.add(normalizeName(table.name));
        expanded = true;
      }
    }
  }

  const tables = state.tables
    .filter((table) => !removedNames.has(normalizeName(table.name)))
    .map((table) => removeReferencesTo(table, removedNames));
  const validKeys = new Set(
    tables.flatMap((table) =>
      table.columns.map((column) => `${table.name}.${column.name}`.toLowerCase()),
    ),
  );
  return success({
    tables,
    attributeMarks: keepValidKeys(state.attributeMarks, validKeys),
    domains: keepValidKeys(state.domains, validKeys),
  });
}

function removeReferencesTo(
  table: DomainState["tables"][number],
  removedNames: Set<string>,
): DomainState["tables"][number] {
  const removedForeignKeys = table.foreignKeys.filter((foreignKey) =>
    removedNames.has(normalizeName(foreignKey.table)),
  );
  const removedColumns = new Set(
    removedForeignKeys.flatMap((foreignKey) => foreignKey.columns.map(normalizeName)),
  );
  const columns = table.columns
    .filter((column) => !removedColumns.has(normalizeName(column.name)))
    .map((column) =>
      column.foreignKey && removedNames.has(normalizeName(column.foreignKey.table))
        ? { ...column, foreignKey: undefined }
        : column,
    );
  return {
    ...table,
    columns,
    primaryKey: table.primaryKey.filter((name) =>
      columns.some((column) => sameName(column.name, name)),
    ),
    uniqueKeys: table.uniqueKeys.filter((key) =>
      key.every((name) => columns.some((column) => sameName(column.name, name))),
    ),
    foreignKeys: table.foreignKeys.filter(
      (foreignKey) => !removedNames.has(normalizeName(foreignKey.table)),
    ),
  };
}

function keepValidKeys<Value>(values: Record<string, Value>, validKeys: Set<string>) {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => validKeys.has(key.toLowerCase())),
  );
}

import { failure, success, type Result } from "../Result";
import { sameName } from "../names";
import type { Column } from "../../parser/ddlParser";
import type { DomainState, OperationChanges } from "./types";

export type AttributeAddition = OperationChanges & { attributeName: string };

export function addAttribute(state: DomainState, tableName: string): Result<AttributeAddition> {
  const table = state.tables.find((item) => item.name === tableName);
  if (!table) return failure("entity-not-found", `No existe la entidad ${tableName}.`);
  const attributeName = nextAttributeName(table.columns);
  const tables = state.tables.map((item) =>
    item.name === tableName
      ? {
          ...item,
          columns: [
            ...item.columns,
            { name: attributeName, type: "TEXT", nullable: true, primaryKey: false, unique: false },
          ],
        }
      : item,
  );
  return success({ tables, attributeName });
}

function nextAttributeName(columns: Column[]): string {
  let name = `atributo_${columns.length + 1}`;
  let suffix = 2;
  while (columns.some((column) => sameName(column.name, name))) {
    name = `atributo_${columns.length + suffix}`;
    suffix += 1;
  }
  return name;
}

export function editAttribute(
  state: DomainState,
  tableName: string,
  oldName: string,
  changes: Partial<Column>,
): Result<OperationChanges> {
  const table = state.tables.find((item) => item.name === tableName);
  if (!table) return failure("entity-not-found", `No existe la entidad ${tableName}.`);
  const newName = changes.name?.trim() ?? oldName;
  if (!newName) return failure("empty-attribute-name", "Escribe el nombre del atributo.");
  if (
    !sameName(newName, oldName) &&
    table.columns.some((column) => sameName(column.name, newName))
  ) {
    return failure("duplicate-attribute-name", `Ya existe un atributo llamado ${newName}.`);
  }

  const columns = table.columns.map((column) =>
    column.name === oldName ? updateColumn(column, changes, newName) : column,
  );
  if (!columns.some((column) => column.primaryKey)) {
    return failure("primary-key-required", "La entidad debe conservar una clave primaria.");
  }
  const mapColumn = (name: string) => (sameName(name, oldName) ? newName : name);
  const uniqueKeys = updateUniqueKeys(table, columns, newName, changes, mapColumn);
  const updatedTable = updateAttributeReferences(table, columns, uniqueKeys, mapColumn);
  const result: OperationChanges = {
    tables: state.tables.map((item) => (item.name !== tableName ? item : updatedTable)),
  };
  if (oldName !== newName) {
    result.attributeMarks = moveAttributeMapValue(
      state.attributeMarks,
      tableName,
      oldName,
      newName,
    );
    result.domains = moveAttributeMapValue(state.domains, tableName, oldName, newName);
  }
  return success(result);
}

function updateColumn(column: Column, changes: Partial<Column>, name: string): Column {
  const alternateKey = changes.alternateKey ?? column.alternateKey;
  return {
    ...column,
    ...changes,
    name,
    unique: alternateKey ? true : (changes.unique ?? column.unique),
  };
}

function updateUniqueKeys(
  table: DomainState["tables"][number],
  columns: Column[],
  name: string,
  changes: Partial<Column>,
  mapColumn: (column: string) => string,
): string[][] {
  const keys = table.uniqueKeys.map((key) => key.map(mapColumn)).filter((key) => key.length);
  if (changes.unique === undefined && changes.alternateKey === undefined) return keys;
  const enabled = columns.find((column) => column.name === name)?.unique;
  return [
    ...keys.filter((key) => !(key.length === 1 && sameName(key[0], name))),
    ...(enabled ? [[name]] : []),
  ];
}

function updateAttributeReferences(
  table: DomainState["tables"][number],
  columns: Column[],
  uniqueKeys: string[][],
  mapColumn: (column: string) => string,
) {
  return {
    ...table,
    columns: columns.map((column) =>
      column.foreignKey?.table === table.name
        ? {
            ...column,
            foreignKey: {
              ...column.foreignKey,
              columns: column.foreignKey.columns?.map(mapColumn),
            },
          }
        : column,
    ),
    primaryKey: columns.filter((column) => column.primaryKey).map((column) => column.name),
    uniqueKeys,
    foreignKeys: table.foreignKeys.map((foreignKey) => ({
      ...foreignKey,
      columns: foreignKey.columns.map(mapColumn),
      targetColumns:
        foreignKey.table === table.name
          ? foreignKey.targetColumns?.map(mapColumn)
          : foreignKey.targetColumns,
    })),
  };
}

function moveAttributeMapValue<Value>(
  values: Record<string, Value>,
  table: string,
  oldName: string,
  newName: string,
): Record<string, Value> {
  const oldKey = `${table}.${oldName}`;
  const value = values[oldKey];
  if (value === undefined) return values;
  const next = { ...values, [`${table}.${newName}`]: value };
  delete next[oldKey];
  return next;
}

export function deleteAttribute(
  state: DomainState,
  tableName: string,
  name: string,
): Result<OperationChanges> {
  const candidate = validateAttributeDeletion(state, tableName, name);
  if (!candidate.ok) return candidate;
  return success(buildAttributeDeletion(state, tableName, name));
}

function validateAttributeDeletion(
  state: DomainState,
  tableName: string,
  name: string,
): Result<true> {
  const table = state.tables.find((item) => item.name === tableName);
  if (!table) return failure("entity-not-found", `No existe la entidad ${tableName}.`);
  const column = table.columns.find((item) => item.name === name);
  if (!column) return failure("attribute-not-found", `No existe el atributo ${name}.`);
  if (column.primaryKey && table.primaryKey.length <= 1) {
    return failure(
      "primary-key-required",
      "No puedes eliminar la única columna de la clave primaria.",
    );
  }
  if (
    state.tables.some((item) =>
      item.foreignKeys.some(
        (foreignKey) =>
          foreignKey.table === tableName && (foreignKey.targetColumns ?? []).includes(name),
      ),
    )
  ) {
    return failure("attribute-is-referenced", `El atributo ${name} está referenciado por una FK.`);
  }
  return success(true);
}

function buildAttributeDeletion(
  state: DomainState,
  tableName: string,
  name: string,
): OperationChanges {
  const tables = state.tables.map((item) =>
    item.name !== tableName
      ? item
      : {
          ...item,
          columns: item.columns.filter((candidate) => candidate.name !== name),
          primaryKey: item.primaryKey.filter((candidate) => candidate !== name),
          uniqueKeys: item.uniqueKeys.filter((key) => !key.some((candidate) => candidate === name)),
          foreignKeys: item.foreignKeys.filter((foreignKey) => !foreignKey.columns.includes(name)),
        },
  );
  const key = `${tableName}.${name}`;
  const attributeMarks = { ...state.attributeMarks };
  const domains = { ...state.domains };
  delete attributeMarks[key];
  delete domains[key];
  return { tables, attributeMarks, domains };
}

import { failure, success, type Result } from "../Result";
import { hasDuplicateNames, isUniqueName, normalizeName, sameName } from "../names";
import type { RelationDraft } from "../model/types";
import type { Column, ForeignKey, Table } from "../../parser/ddlParser";
import type { DomainState } from "./types";

type RelationState = Pick<
  DomainState,
  "tables" | "names" | "cardinalityMinimums" | "relationAttributes"
>;

export function createRelation(state: DomainState, draft: RelationDraft): Result<RelationState> {
  const source = findTable(state.tables, draft.source);
  const target = findTable(state.tables, draft.target);
  if (!source || !target)
    return failure(
      "relation-entity-not-found",
      "Selecciona entidades existentes para la relación.",
    );
  if (!source.primaryKey.length || !target.primaryKey.length) {
    return failure(
      "relation-entity-without-primary-key",
      "Las entidades deben tener clave primaria.",
    );
  }
  if (draft.participants.length >= 3) return createAssociativeRelation(state, draft);
  if (draft.kind === "N:M") return createManyToManyRelation(state, draft, source, target);
  return createBinaryRelation(state, draft, source, target);
}

function createAssociativeRelation(
  state: DomainState,
  draft: RelationDraft,
): Result<RelationState> {
  const participants = draft.participants.map((name) => findTable(state.tables, name));
  if (participants.some((table) => !table)) {
    return failure(
      "relation-entity-not-found",
      "Selecciona una entidad existente para cada participante.",
    );
  }
  if (hasDuplicateNames(draft.participants)) {
    return failure("duplicate-relation-participant", "Cada participante n-ario debe ser distinto.");
  }
  const relationName = draft.name.trim();
  if (!relationName)
    return failure("empty-relation-name", "Escribe el nombre de la interrelación.");
  if (!isUniqueTableName(state.tables, relationName)) {
    return failure("duplicate-relation-name", `Ya existe una tabla llamada ${relationName}.`);
  }

  const built = buildAssociativeTable(participants as Table[], relationName, draft);
  if (!built.ok) return built;
  return success(addAssociation(state, relationName, built.value, draft));
}

function createManyToManyRelation(
  state: DomainState,
  draft: RelationDraft,
  source: Table,
  target: Table,
): Result<RelationState> {
  const relationName = draft.name.trim() || `${source.name}_${target.name}`;
  if (!isUniqueTableName(state.tables, relationName)) {
    return failure("duplicate-relation-name", `Ya existe una tabla llamada ${relationName}.`);
  }
  const association = buildManyToManyTable(source, target, draft, relationName);
  if (!association.ok) return association;
  return success(addAssociation(state, relationName, association.value, draft));
}

function buildManyToManyTable(
  source: Table,
  target: Table,
  draft: RelationDraft,
  name: string,
): Result<Table> {
  const first = createForeignKeyColumns({ ...source, columns: [] }, source, true, "N:M");
  const second = createForeignKeyColumns(
    { ...target, columns: first.columns },
    target,
    true,
    "N:M",
  );
  applyRelationshipMetadata([first.foreignKey, second.foreignKey], draft);
  const columns = [...first.columns, ...second.columns].map((column) => ({
    ...column,
    primaryKey: true,
    nullable: false,
  }));
  const extra = createRelationAttributes(draft.attributes ?? []);
  if (hasDuplicateNames([...columns, ...extra].map((column) => column.name))) {
    return failure(
      "duplicate-association-column",
      "Los atributos de la relación repiten nombres de columnas.",
    );
  }
  return success(
    createTable(
      name,
      [...columns, ...extra],
      columns.map((column) => column.name),
      [first.foreignKey, second.foreignKey],
    ),
  );
}

function createBinaryRelation(
  state: DomainState,
  draft: RelationDraft,
  source: Table,
  target: Table,
): Result<RelationState> {
  const addition = createForeignKeyColumns(target, source, draft.mandatory, draft.kind);
  if (draft.roles) addition.foreignKey.roles = draft.roles;
  if (draft.participantMaximums)
    addition.foreignKey.participantMaximums = draft.participantMaximums;
  const extra = createRelationAttributes(draft.attributes ?? []);
  if (
    hasDuplicateNames(
      [...target.columns, ...addition.columns, ...extra].map((column) => column.name),
    )
  ) {
    return failure(
      "duplicate-relation-column",
      "La relación genera nombres de columnas duplicados.",
    );
  }
  return success(addBinaryRelation(state, target, source, draft, addition, extra));
}

function addBinaryRelation(
  state: DomainState,
  owner: Table,
  referenced: Table,
  draft: RelationDraft,
  addition: { columns: Column[]; foreignKey: ForeignKey },
  extra: Column[],
): RelationState {
  const updatedOwner = {
    ...owner,
    columns: [...owner.columns, ...addition.columns, ...extra],
    uniqueKeys:
      draft.kind === "1:1" ? [...owner.uniqueKeys, addition.foreignKey.columns] : owner.uniqueKeys,
    foreignKeys: [...owner.foreignKeys, addition.foreignKey],
  };
  const relationId = createForeignKeyRelationId(owner.name, addition.foreignKey.columns);
  return {
    ...state,
    tables: state.tables.map((table) => (table.name === owner.name ? updatedOwner : table)),
    names: {
      ...state.names,
      [relationId]: draft.name.trim() || `${referenced.name}_${owner.name}`,
    },
    cardinalityMinimums: draft.participantMinimums
      ? { ...state.cardinalityMinimums, [relationId]: draft.participantMinimums }
      : state.cardinalityMinimums,
    relationAttributes: { ...state.relationAttributes, [relationId]: draft.attributes ?? [] },
  };
}

function buildAssociativeTable(
  participants: Table[],
  name: string,
  draft: RelationDraft,
): Result<Table> {
  let columns: Column[] = [];
  const foreignKeys: ForeignKey[] = [];
  for (const participant of participants) {
    const addition = createForeignKeyColumns(
      { ...participant, name, columns },
      participant,
      true,
      "N:M",
    );
    columns = [
      ...columns,
      ...addition.columns.map((column) => ({ ...column, primaryKey: true, nullable: false })),
    ];
    foreignKeys.push(addition.foreignKey);
  }
  const extra = createRelationAttributes(draft.attributes ?? []);
  if (hasDuplicateNames([...columns, ...extra].map((column) => column.name))) {
    return failure(
      "duplicate-association-column",
      "Los atributos de la relación repiten nombres de columnas.",
    );
  }
  return success(
    createTable(
      name,
      [...columns, ...extra],
      columns.map((column) => column.name),
      foreignKeys,
    ),
  );
}

function addAssociation(
  state: DomainState,
  name: string,
  table: Table,
  draft: RelationDraft,
): RelationState {
  const id = `assoc:${normalizeName(name)}`;
  return {
    ...state,
    tables: [...state.tables, table],
    cardinalityMinimums: draft.participantMinimums
      ? { ...state.cardinalityMinimums, [id]: draft.participantMinimums }
      : state.cardinalityMinimums,
  };
}

function createForeignKeyColumns(
  owner: Table,
  referenced: Table,
  mandatory: boolean,
  relationKind: RelationDraft["kind"],
): { columns: Column[]; foreignKey: ForeignKey } {
  const keyColumns = referenced.primaryKey
    .map((name) => referenced.columns.find((column) => sameName(column.name, name)))
    .filter((column): column is Column => Boolean(column));
  const columns = keyColumns.map((keyColumn) => {
    const name = uniqueColumnName(
      owner.columns,
      `${normalizeName(referenced.name)}_${keyColumn.name}`,
    );
    return {
      name,
      type: keyColumn.type,
      nullable: !mandatory,
      primaryKey: false,
      unique: relationKind === "1:1" && keyColumns.length === 1,
      foreignKey: { table: referenced.name, columns: referenced.primaryKey },
    };
  });
  return {
    columns,
    foreignKey: {
      columns: columns.map((column) => column.name),
      table: referenced.name,
      targetColumns: referenced.primaryKey,
    },
  };
}

function uniqueColumnName(columns: Column[], base: string): string {
  let name = base;
  let suffix = 2;
  while (columns.some((column) => sameName(column.name, name))) name = `${base}_${suffix++}`;
  return name;
}

function applyRelationshipMetadata(foreignKeys: ForeignKey[], draft: RelationDraft): void {
  for (const foreignKey of foreignKeys) {
    if (draft.roles) foreignKey.roles = draft.roles;
    if (draft.participantMaximums) foreignKey.participantMaximums = draft.participantMaximums;
  }
}

function createRelationAttributes(names: string[]): Column[] {
  return names.map((name) => ({
    name,
    type: "TEXT",
    nullable: true,
    primaryKey: false,
    unique: false,
  }));
}

function createTable(
  name: string,
  columns: Column[],
  primaryKey: string[],
  foreignKeys: ForeignKey[],
): Table {
  return { name, columns, primaryKey, uniqueKeys: [], foreignKeys, checks: [] };
}

function findTable(tables: Table[], name: string): Table | undefined {
  return tables.find((table) => sameName(table.name, name));
}

function isUniqueTableName(tables: Table[], name: string): boolean {
  return isUniqueName(
    name,
    tables.map((table) => table.name),
  );
}

function createForeignKeyRelationId(owner: string, columns: string[]): string {
  return `fk:${normalizeName(owner)}:${columns.map(normalizeName).join(",")}`;
}

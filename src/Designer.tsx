import { useEffect, useState } from "react";
import type { AttributeMark, RelationDraft } from "./model";
import { sameName } from "./domain/names";
import type {
  Column,
  DependencyMark,
  ForeignKey,
  Table,
  WeakCardinality,
} from "./parser/ddlParser";

type Props = {
  tables: Table[];
  onChange: (tables: Table[]) => void;
  attributeMarks: Record<string, AttributeMark>;
  setAttributeMarks: (marks: Record<string, AttributeMark>) => void;
  domains: Record<string, string>;
  setDomains: (domains: Record<string, string>) => void;
  createRelation: (draft: RelationDraft) => boolean;
  requestHierarchy: () => void;
  requestArrange: () => void;
  renameEntity: (oldName: string, newName: string) => boolean;
  deleteEntity: (name: string) => void;
  addAttribute: (table: string) => string | null;
  editAttribute: (table: string, oldName: string, changes: Partial<Column>) => boolean;
  deleteAttribute: (table: string, name: string) => boolean;
  editRequest?: { entity: string; attribute?: string; token: number } | null;
  onEditRequestHandled?: (token: number) => void;
  onEntityRenamed?: (oldName: string, newName: string) => void;
  entityCreateRequest?: EntityCreationRequest | null;
  weakCreateRequest?: WeakEntityCreationRequest | null;
  relationCreateRequest?: RelationCreationRequest | null;
  attributeCreateRequest?: AttributeCreationRequest | null;
  onCreationRequestHandled?: (token: number) => void;
  onAttributeRequestHandled?: (token: number) => void;
  onEntityCreated?: (name: string, position?: { x: number; y: number }) => void;
};
const emptyAttribute = (name = "") => ({
  name,
  type: "TEXT",
  primaryKey: false,
  alternateKey: false,
  unique: false,
  required: false,
  kind: "simple" as const,
  parts: "",
  domain: "",
});
const keyColumns = (columns: Column[]) =>
  columns.filter((column) => column.primaryKey).map((column) => column.name);
const isAssociative = (table: Table) =>
  table.foreignKeys.length >= 2 &&
  table.primaryKey.length > 0 &&
  table.primaryKey.every((key) =>
    table.foreignKeys.some((fk) => fk.columns.some((column) => sameName(column, key))),
  );
const relationKindFromMaximums = (maximums: ("1" | "n")[]) =>
  maximums[0] === "1" && maximums[1] === "1"
    ? ("1:1" as const)
    : maximums[0] === "n" && maximums[1] === "n"
      ? ("N:M" as const)
      : maximums[0] === "n" && maximums[1] === "1"
        ? ("N:1" as const)
        : ("1:N" as const);

import type { DraftAttribute } from "./features/designer/DraftAttribute";
import type { RelationMode } from "./features/designer/relationPreviewOptions";
import type {
  AttributeCreationRequest,
  EntityCreationRequest,
  RelationCreationRequest,
  WeakEntityCreationRequest,
} from "./features/designer/creationRequests";
import { EntityMenuModal } from "./features/designer/modals/EntityMenuModal";
import { AttributeMenuModal } from "./features/designer/modals/AttributeMenuModal";

import { EntityDialogForm } from "./features/designer/modals/EntityDialogForm";
import { WeakEntityDialogForm } from "./features/designer/modals/WeakEntityDialogForm";
import { RelationDialogForm } from "./features/designer/modals/RelationDialogForm";
export function Designer({
  tables,
  onChange,
  attributeMarks,
  setAttributeMarks,
  domains,
  setDomains,
  createRelation,
  requestHierarchy,
  requestArrange,
  renameEntity,
  deleteEntity,
  addAttribute,
  editAttribute,
  deleteAttribute,
  editRequest,
  onEditRequestHandled,
  onEntityRenamed,
  entityCreateRequest,
  weakCreateRequest,
  relationCreateRequest,
  attributeCreateRequest,
  onCreationRequestHandled,
  onAttributeRequestHandled,
  onEntityCreated,
}: Props) {
  const hierarchyEntityCount = tables.filter((table) => !isAssociative(table)).length;
  const [dialog, setDialog] = useState<"entity" | "weak" | "relation" | null>(null);
  const [entityName, setEntityName] = useState("");
  const [attributes, setAttributes] = useState<DraftAttribute[]>([
    { ...emptyAttribute("id"), type: "INTEGER", primaryKey: true, required: true },
  ]);
  const [selectedDraftAttribute, setSelectedDraftAttribute] = useState<number | null>(null);
  const [editingDraftAttribute, setEditingDraftAttribute] = useState(false);
  const [relation, setRelation] = useState({
    source: "",
    target: "",
    additional: [] as string[],
    minimums: [1, 0] as (0 | 1)[],
    maximums: ["1", "n"] as ("1" | "n")[],
    name: "tiene",
    kind: "1:N" as RelationDraft["kind"],
    mandatory: false,
    attributes: [] as string[],
    roles: ["", ""] as [string, string],
  });
  const [relationMode, setRelationMode] = useState<RelationMode>("binary");
  const [weakDraft, setWeakDraft] = useState({
    name: "",
    parent: "",
    dependency: "ID" as DependencyMark,
    cardinality: "0:N" as WeakCardinality,
    identifier: "",
    foreignKeyName: "",
    relationName: "",
    attributes: "",
  });
  const [weakAttributes, setWeakAttributes] = useState<DraftAttribute[]>([]);
  const [error, setError] = useState("");
  const [editingEntityName, setEditingEntityName] = useState<string | null>(null);
  const [entityMenu, setEntityMenu] = useState<string | null>(null);
  const [entityNameDraft, setEntityNameDraft] = useState("");
  const [attributeMenu, setAttributeMenu] = useState<{ entity: string; name: string } | null>(null);
  const [attributeDraft, setAttributeDraft] = useState<Column | null>(null);
  const [menuError, setMenuError] = useState("");
  const [pendingEntityPosition, setPendingEntityPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const openEntity = (position?: { x: number; y: number }) => {
    setEditingEntityName(null);
    setEntityName(`entidad_${tables.length + 1}`);
    setAttributes([{ ...emptyAttribute("id"), type: "INTEGER", primaryKey: true, required: true }]);
    setSelectedDraftAttribute(null);
    setEditingDraftAttribute(false);
    setPendingEntityPosition(position ?? null);
    setError("");
    setDialog("entity");
  };
  useEffect(() => {
    if (!editRequest) return;
    const table = tables.find((item) => item.name === editRequest.entity);
    if (!table) {
      onEditRequestHandled?.(editRequest.token);
      return;
    }
    const draft = table.columns.map((column) => {
      const mark = attributeMarks[`${table.name}.${column.name}`];
      return {
        name: column.name,
        originalName: column.name,
        type: column.type,
        primaryKey: column.primaryKey,
        alternateKey: Boolean(column.alternateKey),
        unique: column.unique,
        required: !column.nullable,
        kind: mark?.kind ?? "simple",
        parts: mark?.parts.join(", ") ?? "",
        domain: domains[`${table.name}.${column.name}`] ?? "",
      } as DraftAttribute;
    });
    const selectedIndex = editRequest.attribute
      ? draft.findIndex(
          (attribute) =>
            attribute.originalName &&
            editRequest.attribute &&
            sameName(attribute.originalName, editRequest.attribute),
        )
      : -1;
    setEditingEntityName(table.name);
    setEntityName(table.name);
    setAttributes(draft);
    setSelectedDraftAttribute(selectedIndex >= 0 ? selectedIndex : null);
    setEditingDraftAttribute(selectedIndex >= 0);
    setPendingEntityPosition(null);
    setError("");
    setDialog("entity");
    onEditRequestHandled?.(editRequest.token);
  }, [editRequest?.token]);
  const openRelation = (source = "") => {
    setRelationMode("binary");
    setRelation({
      source: tables.some((table) => sameName(table.name, source)) ? source : "",
      target: "",
      additional: [],
      minimums: [1, 0],
      maximums: ["1", "n"],
      name: "tiene",
      kind: "1:N",
      mandatory: false,
      attributes: [],
      roles: ["", ""],
    });
    setError("");
    setDialog("relation");
  };
  const changeRelationMode = (next: RelationMode) => {
    if (next === relationMode) return;
    setRelationMode(next);
    setRelation((current) => {
      const sameEntity = sameName(current.target, current.source);
      if (next === "recursive")
        return {
          ...current,
          additional: [],
          target: current.source,
          minimums: [0, 0],
          maximums: ["1", "n"],
        };
      if (next === "nary")
        return {
          ...current,
          additional: [""],
          target: sameEntity ? "" : current.target,
          minimums: [0, 0, 0],
          maximums: ["n", "n"],
        };
      return {
        ...current,
        additional: [],
        target: sameEntity ? "" : current.target,
        minimums: [1, 0],
        maximums: ["1", "n"],
      };
    });
  };
  const setAdditionalParticipant = (index: number, value: string) =>
    setRelation((current) => ({
      ...current,
      additional: current.additional.map((item, i) => (i === index ? value : item)),
    }));
  const addParticipant = () =>
    setRelation((current) => ({
      ...current,
      additional: [...current.additional, ""],
      minimums: [...current.minimums, 0],
    }));
  const removeParticipant = (index: number) =>
    setRelation((current) => ({
      ...current,
      additional: current.additional.filter((_, i) => i !== index),
      minimums: current.minimums.filter((_, i) => i !== index + 2),
    }));
  const openWeakEntity = (parentName = "") => {
    const parent =
      tables.find((table) => table.name === parentName && table.primaryKey.length > 0) ??
      tables.find((table) => table.primaryKey.length > 0);
    setWeakDraft({
      name: `entidad_debil_${tables.length + 1}`,
      parent: parent?.name ?? "",
      dependency: "ID",
      cardinality: "0:N",
      identifier: "",
      foreignKeyName: "",
      relationName: "",
      attributes: "",
    });
    setWeakAttributes([]);
    setPendingEntityPosition(null);
    setError("");
    setDialog("weak");
  };
  useEffect(() => {
    if (!entityCreateRequest) return;
    openEntity(entityCreateRequest.position);
    onCreationRequestHandled?.(entityCreateRequest.token);
  }, [entityCreateRequest?.token]);
  useEffect(() => {
    if (!weakCreateRequest) return;
    openWeakEntity(weakCreateRequest.parent);
    onCreationRequestHandled?.(weakCreateRequest.token);
  }, [weakCreateRequest?.token]);
  useEffect(() => {
    if (!relationCreateRequest) return;
    openRelation(relationCreateRequest.source);
    onCreationRequestHandled?.(relationCreateRequest.token);
  }, [relationCreateRequest?.token]);
  const saveWeakEntity = () => {
    const name = weakDraft.name.trim();
    const parent = tables.find((table) => table.name === weakDraft.parent);
    const identifier = weakDraft.identifier.trim();
    const identifying = weakDraft.dependency === "ID";
    const maxOne = weakDraft.cardinality.endsWith(":1");
    const needsIdentifier = !identifying;
    const discriminants =
      identifying && !maxOne
        ? weakAttributes
            .filter((attribute) => attribute.primaryKey)
            .map((attribute) => attribute.name.trim())
        : [];
    if (!name) {
      setError("Escribe un nombre para la entidad débil.");
      return;
    }
    if (tables.some((table) => sameName(table.name, name))) {
      setError("Ya existe una entidad con ese nombre.");
      return;
    }
    if (!parent || !parent.primaryKey.length) {
      setError("Selecciona una entidad fuerte que tenga clave primaria.");
      return;
    }
    if (needsIdentifier && !identifier) {
      setError("Escribe el identificador propio de la entidad débil.");
      return;
    }
    if (identifying && !maxOne && !discriminants.length) {
      setError("Marca al menos un atributo como discriminante para la identificación.");
      return;
    }
    const parentColumns = parent.primaryKey
      .map((key) => parent.columns.find((column) => sameName(column.name, key)))
      .filter((column): column is Column => Boolean(column));
    if (parentColumns.length !== parent.primaryKey.length) {
      setError("No se pudieron resolver todos los atributos de la PK de la entidad fuerte.");
      return;
    }
    const customForeignKeyName = weakDraft.foreignKeyName.trim();
    const foreignColumns: Column[] = parentColumns.map((column, index) => {
      const base =
        weakDraft.dependency === "E"
          ? `${parent.name.toLowerCase()}_${column.name}`
          : index === 0 && parentColumns.length === 1 && customForeignKeyName
            ? customForeignKeyName
            : column.name;
      let foreignName = base;
      let suffix = 2;
      while (
        (needsIdentifier && sameName(identifier, foreignName)) ||
        discriminants.some((discriminant) => sameName(discriminant, foreignName))
      )
        foreignName = `${base}_${suffix++}`;
      return {
        name: foreignName,
        type: column.type,
        nullable: false,
        primaryKey: identifying,
        unique: false,
        foreignKey: {
          table: parent.name,
          columns: parent.primaryKey,
          dependency: weakDraft.dependency,
          onDelete: "CASCADE",
        },
      };
    });
    const ownKey: Column = {
      name: identifier,
      type: "INTEGER",
      nullable: false,
      primaryKey: true,
      unique: false,
    };
    const extraNames = weakAttributes.map((attribute) => attribute.name.trim()).filter(Boolean);
    if (weakAttributes.some((attribute) => !attribute.name.trim())) {
      setError("Completa el nombre de todos los atributos.");
      return;
    }
    const keyColumns = needsIdentifier ? [identifier] : [];
    const names = [
      ...foreignColumns.map((column) => column.name),
      ...keyColumns,
      ...extraNames,
    ].map((item) => item.toLowerCase());
    if (new Set(names).size !== names.length) {
      setError("Los nombres de atributos deben ser únicos y distintos a la FK heredada.");
      return;
    }
    const extras: Column[] = weakAttributes
      .filter((attribute) => attribute.name.trim())
      .map((attribute) => ({
        name: attribute.name.trim(),
        type: attribute.type.trim() || "TEXT",
        nullable: !(identifying && !maxOne && attribute.primaryKey) && !attribute.required,
        primaryKey: identifying && !maxOne && attribute.primaryKey,
        unique: attribute.unique || attribute.alternateKey,
        alternateKey: attribute.alternateKey,
      }));
    const columns = [...foreignColumns, ...(needsIdentifier ? [ownKey] : []), ...extras];
    const relationName = weakDraft.relationName.trim();
    if (!relationName) {
      setError("Escribe el nombre de la relación.");
      return;
    }
    const foreignKey: ForeignKey = {
      columns: foreignColumns.map((column) => column.name),
      table: parent.name,
      targetColumns: parent.primaryKey,
      dependency: weakDraft.dependency,
      onDelete: "CASCADE",
      weakCardinality: weakDraft.cardinality,
      partialIdentifiers: discriminants,
      relationName,
    };
    const uniqueKeys = maxOne && !identifying ? [foreignKey.columns] : [];
    const table: Table = {
      name,
      columns,
      primaryKey: columns.filter((column) => column.primaryKey).map((column) => column.name),
      uniqueKeys,
      foreignKeys: [foreignKey],
      checks: [],
    };
    onChange([...tables, table]);
    onEntityCreated?.(name, pendingEntityPosition ?? undefined);
    setPendingEntityPosition(null);
    const marks = { ...attributeMarks };
    const nextDomains = { ...domains };
    weakAttributes.forEach((attribute) => {
      const key = `${name}.${attribute.name.trim()}`;
      if (attribute.kind !== "simple")
        marks[key] = {
          kind: attribute.kind,
          parts: attribute.parts
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean),
        };
      if (attribute.domain.trim()) nextDomains[key] = attribute.domain.trim();
    });
    setAttributeMarks(marks);
    setDomains(nextDomains);
    setDialog(null);
  };
  const saveEntity = () => {
    const name = entityName.trim();
    if (!name) {
      setError("Escribe un nombre para la entidad.");
      return;
    }
    if (tables.some((table) => sameName(table.name, name))) {
      setError("Ya existe una entidad con ese nombre.");
      return;
    }
    if (!attributes.length || attributes.some((attribute) => !attribute.name.trim())) {
      setError("Completa el nombre de todos los atributos.");
      return;
    }
    if (
      new Set(attributes.map((attribute) => attribute.name.trim().toLowerCase())).size !==
      attributes.length
    ) {
      setError("Los nombres de los atributos deben ser únicos dentro de la entidad.");
      return;
    }
    const primary = attributes.filter((attribute) => attribute.primaryKey);
    if (primary.length !== 1) {
      setError("Cada entidad debe tener exactamente una clave primaria (PK).");
      return;
    }
    if (primary[0].kind === "optional" || primary[0].kind === "multivalued") {
      setError("La PK no puede ser opcional ni multivaluada.");
      return;
    }
    const columns: Column[] = attributes.map((attribute) => ({
      name: attribute.name.trim(),
      type: attribute.type.trim() || "TEXT",
      nullable: !attribute.primaryKey && (!attribute.required || attribute.kind === "optional"),
      primaryKey: attribute.primaryKey,
      alternateKey: attribute.alternateKey,
      unique: attribute.unique || attribute.alternateKey,
    }));
    const table: Table = {
      name,
      columns,
      primaryKey: keyColumns(columns),
      uniqueKeys: columns.filter((column) => column.unique).map((column) => [column.name]),
      foreignKeys: [],
      checks: [],
    };
    onChange([...tables, table]);
    onEntityCreated?.(name, pendingEntityPosition ?? undefined);
    setPendingEntityPosition(null);
    const marks = { ...attributeMarks };
    attributes.forEach((attribute) => {
      if (attribute.kind !== "simple")
        marks[`${name}.${attribute.name.trim()}`] = {
          kind: attribute.kind,
          parts: attribute.parts
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean),
        };
    });
    setAttributeMarks(marks);
    setDomains({
      ...domains,
      ...Object.fromEntries(
        attributes
          .filter((attribute) => attribute.domain.trim())
          .map((attribute) => [`${name}.${attribute.name.trim()}`, attribute.domain.trim()]),
      ),
    });
    setDialog(null);
  };
  const saveEditedEntity = () => {
    if (!editingEntityName) return saveEntity();
    const oldName = editingEntityName;
    const nextName = entityName.trim();
    if (!nextName) {
      setError("Escribe un nombre para la entidad.");
      return;
    }
    if (tables.some((table) => sameName(table.name, nextName) && !sameName(table.name, oldName))) {
      setError("Ya existe una entidad con ese nombre.");
      return;
    }
    if (!attributes.length || attributes.some((attribute) => !attribute.name.trim())) {
      setError("Completa el nombre de todos los atributos.");
      return;
    }
    if (
      new Set(attributes.map((attribute) => attribute.name.trim().toLowerCase())).size !==
      attributes.length
    ) {
      setError("Los nombres de los atributos deben ser únicos dentro de la entidad.");
      return;
    }
    if (attributes.filter((attribute) => attribute.primaryKey).length !== 1) {
      setError("Cada entidad debe tener exactamente una clave primaria (PK).");
      return;
    }
    const original = tables.find((table) => table.name === oldName);
    if (!original) return;
    const renamedColumns = new Map(
      attributes
        .filter((attribute) => attribute.originalName)
        .map((attribute) => [attribute.originalName!.toLowerCase(), attribute.name.trim()]),
    );
    const mapColumn = (name: string) => renamedColumns.get(name.toLowerCase()) ?? name;
    const columns: Column[] = attributes.map((attribute) => {
      const name = attribute.name.trim();
      const previous = original.columns.find((column) =>
        sameName(column.name, attribute.originalName ?? ""),
      );
      return {
        ...(previous ?? {}),
        name,
        type: attribute.type.trim() || "TEXT",
        nullable: !attribute.primaryKey && (!attribute.required || attribute.kind === "optional"),
        primaryKey: attribute.primaryKey,
        alternateKey: attribute.alternateKey,
        unique: attribute.unique || attribute.alternateKey,
      };
    });
    const retained = new Set(columns.map((column) => column.name.toLowerCase()));
    const nextTables = tables.map((table) => {
      if (table.name === oldName)
        return {
          ...table,
          name: nextName,
          columns: columns.map((column) =>
            column.foreignKey && sameName(column.foreignKey.table, oldName)
              ? {
                  ...column,
                  foreignKey: {
                    ...column.foreignKey,
                    table: nextName,
                    columns: column.foreignKey.columns?.map(mapColumn),
                  },
                }
              : column,
          ),
          primaryKey: columns.filter((column) => column.primaryKey).map((column) => column.name),
          uniqueKeys: [
            ...new Map(
              [
                ...table.uniqueKeys
                  .map((key) =>
                    key.map(mapColumn).filter((name) => retained.has(name.toLowerCase())),
                  )
                  .filter((key) => key.length),
                ...columns.filter((column) => column.unique).map((column) => [column.name]),
              ].map((key) => [
                key.map((name) => name.toLowerCase()).join("|") || key[0].toLowerCase(),
                key,
              ]),
            ).values(),
          ],
          foreignKeys: table.foreignKeys
            .filter((fk) => fk.columns.every((name) => retained.has(mapColumn(name).toLowerCase())))
            .map((fk) => ({
              ...fk,
              table: sameName(fk.table, oldName) ? nextName : fk.table,
              columns: fk.columns.map(mapColumn),
              targetColumns: sameName(fk.table, oldName)
                ? fk.targetColumns?.map(mapColumn)
                : fk.targetColumns,
            })),
        };
      return {
        ...table,
        columns: table.columns.map((column) =>
          column.foreignKey && sameName(column.foreignKey.table, oldName)
            ? {
                ...column,
                foreignKey: {
                  ...column.foreignKey,
                  table: nextName,
                  columns: column.foreignKey.columns?.map(mapColumn),
                },
              }
            : column,
        ),
        foreignKeys: table.foreignKeys.map((fk) => ({
          ...fk,
          table: sameName(fk.table, oldName) ? nextName : fk.table,
          targetColumns: sameName(fk.table, oldName)
            ? fk.targetColumns?.map(mapColumn)
            : fk.targetColumns,
        })),
      };
    });
    onChange(nextTables);
    const nextMarks = Object.fromEntries(
      Object.entries(attributeMarks).filter(([key]) => !key.startsWith(`${oldName}.`)),
    );
    const nextDomains = Object.fromEntries(
      Object.entries(domains).filter(([key]) => !key.startsWith(`${oldName}.`)),
    );
    attributes.forEach((attribute) => {
      const key = `${nextName}.${attribute.name.trim()}`;
      if (attribute.kind !== "simple")
        nextMarks[key] = {
          kind: attribute.kind,
          parts: attribute.parts
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean),
        };
      if (attribute.domain.trim()) nextDomains[key] = attribute.domain.trim();
    });
    setAttributeMarks(nextMarks);
    setDomains(nextDomains);
    if (oldName !== nextName) onEntityRenamed?.(oldName, nextName);
    setDialog(null);
    setEditingEntityName(null);
  };
  const saveRelation = () => {
    if (tables.length < 1) {
      setError("Crea una entidad antes de añadir una interrelación.");
      return;
    }
    const participants = [relation.source, relation.target, ...relation.additional];
    if (participants.some((name) => !name)) {
      setError("Selecciona una entidad para cada participante.");
      return;
    }
    if (
      participants.length > 2 &&
      new Set(participants.map((name) => name.toLowerCase())).size !== participants.length
    ) {
      setError(
        "En una interrelación de tres o cuatro entidades, cada participante debe ser distinto.",
      );
      return;
    }
    const recursive =
      participants.length === 2 &&
      participants[0].toLocaleLowerCase() === participants[1].toLocaleLowerCase();
    const kind = participants.length > 2 ? "N:M" : relationKindFromMaximums(relation.maximums);
    const name = relation.name.trim() || "tiene";
    const participantMinimums = relation.minimums.slice(0, participants.length);
    const participantMaximums = relation.maximums.slice(0, participants.length);
    const ownerIndex = kind === "N:1" ? 0 : 1;
    const draft: RelationDraft = {
      ...relation,
      source: participants[0],
      target: participants[1],
      participants,
      participantMinimums,
      participantMaximums,
      kind,
      mandatory: kind !== "N:M" && participantMinimums[ownerIndex] === 1,
      name,
      associativeTableName:
        kind === "N:M" && participants.length === 2
          ? `${relation.source}_${relation.target}`
          : undefined,
      roles: recursive
        ? (relation.roles.map((role) => role.trim()) as [string, string])
        : undefined,
      attributes: relation.attributes.map((item) => item.trim()).filter(Boolean),
    };
    if (!createRelation(draft)) {
      setError(
        "No se pudo crear: revisa las PK, los nombres de atributos y que " +
          "el nombre de la asociación esté disponible.",
      );
      return;
    }
    setDialog(null);
  };
  const updateAttribute = (index: number, patch: Partial<DraftAttribute>) =>
    setAttributes((current) =>
      current.map((attribute, i) => ({
        ...attribute,
        ...(i === index ? patch : {}),
        ...(patch.primaryKey && i !== index ? { primaryKey: false } : {}),
      })),
    );
  const openEntityMenu = (name: string) => {
    setEntityMenu(name);
    setEntityNameDraft(name);
    setAttributeMenu(null);
    setMenuError("");
  };
  const openAttributeMenu = (entity: string, column: Column) => {
    setAttributeMenu({ entity, name: column.name });
    setAttributeDraft(column);
    setEntityMenu(null);
    setMenuError("");
  };
  useEffect(() => {
    if (!attributeCreateRequest) return;
    const table = tables.find((item) => sameName(item.name, attributeCreateRequest.entity));
    const column = attributeCreateRequest.attribute
      ? table?.columns.find((item) => sameName(item.name, attributeCreateRequest.attribute!))
      : table
        ? table.columns[table.columns.length - 1]
        : undefined;
    if (!table || !column) return;
    openAttributeMenu(table.name, column);
    onAttributeRequestHandled?.(attributeCreateRequest.token);
  }, [attributeCreateRequest?.token, tables]);
  const updateCurrentAttribute = (patch: Partial<Column>) => {
    if (!attributeMenu || !attributeDraft) return;
    if (!editAttribute(attributeMenu.entity, attributeMenu.name, patch)) {
      setMenuError("No se pudo guardar. Revisa el nombre y las claves relacionadas.");
      return;
    }
    const next = { ...attributeDraft, ...patch };
    setAttributeDraft(next);
    setAttributeMenu({ ...attributeMenu, name: next.name ?? attributeMenu.name });
  };
  const updateAttributeMark = (kind: "simple" | AttributeMark["kind"]) => {
    if (!attributeMenu) return;
    const key = attributeMenu.entity + "." + attributeMenu.name;
    const next = { ...attributeMarks };
    if (kind === "simple") delete next[key];
    else next[key] = { kind, parts: next[key]?.parts ?? [] };
    setAttributeMarks(next);
  };

  const selectedDraft =
    selectedDraftAttribute === null ? undefined : attributes[selectedDraftAttribute];

  return (
    <div className="designer tool-palette">
      <header className="designer-heading">
        <div>
          <h2>Herramientas del modelo</h2>
          <p>Selecciona una figura para agregarla al diagrama.</p>
        </div>
      </header>
      <div className="model-tools">
        <button type="button" className="model-tool" onClick={() => openEntity()}>
          <span className="tool-shape entity-shape" aria-hidden="true" />
          <span>
            <strong>Entidad</strong>
            <small>Crear entidad y clasificar atributos</small>
          </span>
          <b>＋</b>
        </button>
        <button
          type="button"
          className="model-tool"
          onClick={() => openWeakEntity()}
          disabled={!tables.some((table) => table.primaryKey.length > 0)}
        >
          <span className="tool-shape weak-entity-shape" aria-hidden="true" />
          <span>
            <strong>Entidad débil</strong>
            <small>Depende de una entidad fuerte · Ex o Id</small>
          </span>
          <b>＋</b>
        </button>
        <button
          type="button"
          className="model-tool"
          onClick={() => openRelation()}
          disabled={tables.length === 0}
        >
          <span className="tool-shape relation-shape" aria-hidden="true" />
          <span>
            <strong>Interrelación</strong>
            <small>
              {tables.length
                ? "Conectar entidades, incluso consigo mismas"
                : "Crea una entidad para habilitar esta opción"}
            </small>
          </span>
          <b>＋</b>
        </button>
        <button
          type="button"
          className="model-tool"
          onClick={requestHierarchy}
          disabled={hierarchyEntityCount < 3}
        >
          <span className="tool-shape hierarchy-shape" aria-hidden="true" />
          <span>
            <strong>Herencia</strong>
            <small>Requiere tres entidades: un supertipo y dos subtipos</small>
          </span>
          <b>＋</b>
        </button>
      </div>
      <button
        type="button"
        className="arrange-model"
        title="Reordena las entidades y ajusta el zoom para mostrar el diagrama completo"
        onClick={requestArrange}
        disabled={tables.length < 2}
      >
        ✦ Ordenar y ajustar MER
      </button>
      <div className="palette-summary">
        <strong>
          {tables.length} {tables.length === 1 ? "entidad" : "entidades"}
        </strong>
        <div className="entity-card-list">
          {tables.map((table) => (
            <details className="entity-card" key={table.name}>
              <summary onDoubleClick={() => openEntityMenu(table.name)}>
                <span>
                  <strong>{table.name}</strong>
                  <small>
                    {table.columns.length} {table.columns.length === 1 ? "atributo" : "atributos"}
                  </small>
                </span>
                <small>Doble clic para editar</small>
              </summary>
              <div className="entity-card-attributes">
                {table.columns.map((column) => (
                  <div
                    className="entity-attribute-card"
                    key={column.name}
                    onDoubleClick={() => openAttributeMenu(table.name, column)}
                  >
                    <span>
                      <strong>{column.name}</strong>
                      <small>
                        {column.type}
                        {column.primaryKey ? " · PK" : ""}
                        {column.alternateKey ? " · AK" : ""}
                        {column.unique ? " · UK" : ""}
                        {!column.nullable ? " · NOT NULL" : ""}
                      </small>
                    </span>
                    <button type="button" onClick={() => openAttributeMenu(table.name, column)}>
                      Editar
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-draft-attribute"
                  onClick={() => {
                    const name = addAttribute(table.name);
                    if (name) {
                      const added = table.columns.find((column) => column.name === name) ?? {
                        name,
                        type: "TEXT",
                        nullable: true,
                        primaryKey: false,
                        unique: false,
                      };
                      openAttributeMenu(table.name, added);
                    }
                  }}
                >
                  ＋ Añadir atributo
                </button>
              </div>
            </details>
          ))}
        </div>
      </div>
      <EntityMenuModal
        entityMenu={entityMenu}
        tables={tables}
        setEntityMenu={setEntityMenu}
        entityNameDraft={entityNameDraft}
        setEntityNameDraft={setEntityNameDraft}
        menuError={menuError}
        deleteEntity={deleteEntity}
        renameEntity={renameEntity}
      />
      <AttributeMenuModal
        attributeMenu={attributeMenu}
        attributeDraft={attributeDraft}
        setAttributeMenu={setAttributeMenu}
        updateCurrentAttribute={updateCurrentAttribute}
        attributeMarks={attributeMarks}
        setAttributeMarks={setAttributeMarks}
        updateAttributeMark={updateAttributeMark}
        domains={domains}
        setDomains={setDomains}
        menuError={menuError}
        setMenuError={setMenuError}
        tables={tables}
        deleteAttribute={deleteAttribute}
      />
      {dialog && (
        <div
          className="designer-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDialog(null);
              setEditingEntityName(null);
              setPendingEntityPosition(null);
            }
          }}
        >
          <section
            className="designer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="designer-modal-title"
          >
            <header>
              <div>
                <h3 id="designer-modal-title">
                  {dialog === "entity"
                    ? editingEntityName
                      ? "Editar entidad"
                      : "Nueva entidad"
                    : dialog === "weak"
                      ? "Nueva entidad débil"
                      : "Nueva interrelación"}
                </h3>
                {dialog !== "entity" && (
                  <p>
                    {dialog === "weak"
                      ? "Vincúlala a una entidad fuerte y define cómo se identifica."
                      : "Elige sus extremos, cardinalidad y atributos."}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => {
                  setDialog(null);
                  setEditingEntityName(null);
                  setPendingEntityPosition(null);
                }}
              >
                ×
              </button>
            </header>
            {dialog === "entity" ? (
              <EntityDialogForm
                entityName={entityName}
                setEntityName={setEntityName}
                attributes={attributes}
                setAttributes={setAttributes}
                selectedDraftAttribute={selectedDraftAttribute}
                setSelectedDraftAttribute={setSelectedDraftAttribute}
                editingDraftAttribute={editingDraftAttribute}
                setEditingDraftAttribute={setEditingDraftAttribute}
                emptyAttribute={emptyAttribute}
                selectedDraft={selectedDraft}
                updateAttribute={updateAttribute}
              />
            ) : dialog === "weak" ? (
              <WeakEntityDialogForm
                weakDraft={weakDraft}
                setWeakDraft={setWeakDraft}
                weakAttributes={weakAttributes}
                setWeakAttributes={setWeakAttributes}
                tables={tables}
                emptyAttribute={emptyAttribute}
              />
            ) : (
              <RelationDialogForm
                relation={relation}
                setRelation={setRelation}
                relationMode={relationMode}
                changeRelationMode={changeRelationMode}
                setAdditionalParticipant={setAdditionalParticipant}
                addParticipant={addParticipant}
                removeParticipant={removeParticipant}
                tables={tables}
              />
            )}
            {error && (
              <p className="designer-error" role="alert">
                {error}
              </p>
            )}
            <footer>
              {dialog === "entity" && editingEntityName && (
                <button
                  type="button"
                  className="inspector-danger"
                  onClick={() => {
                    deleteEntity(editingEntityName);
                    setDialog(null);
                    setEditingEntityName(null);
                    setPendingEntityPosition(null);
                  }}
                >
                  Eliminar entidad
                </button>
              )}
              <button
                type="button"
                className="modal-cancel"
                onClick={() => {
                  setDialog(null);
                  setEditingEntityName(null);
                  setPendingEntityPosition(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="modal-save"
                onClick={
                  dialog === "entity"
                    ? editingEntityName
                      ? saveEditedEntity
                      : saveEntity
                    : dialog === "weak"
                      ? saveWeakEntity
                      : saveRelation
                }
              >
                {dialog === "entity"
                  ? editingEntityName
                    ? "Guardar cambios"
                    : "Crear entidad"
                  : dialog === "weak"
                    ? "Crear entidad débil"
                    : "Crear interrelación"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

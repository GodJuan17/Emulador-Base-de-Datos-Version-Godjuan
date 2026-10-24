import { useMemo, useState } from "react";
import { toDiagram } from "./model";
import { Diagram } from "./Diagram";
import { Designer } from "./Designer";
import { generateDDL } from "./generateDDL";
import type { Column, ForeignKey, Table } from "./parser/ddlParser";
import type { AttributeMark, RelationDraft } from "./model";
import { usePersistentState } from "./persistence";
export function App() {
  const [exerciseStatement, setExerciseStatement] = usePersistentState(
    "sima.modelador.exercise-statement.v1",
    "",
  );
  const [tables, setTables] = usePersistentState<Table[]>("sima.modelador.tables.v1", []);
  const [tab, setTab] = usePersistentState<"conceptual" | "logical" | "ddl">(
    "sima.modelador.tab.v1",
    "conceptual",
  );
  const [names, setNames] = usePersistentState<Record<string, string>>(
    "sima.modelador.relation-names.v1",
    {},
  );
  const [cardinalityMinimums, setCardinalityMinimums] = usePersistentState<
    Record<string, (0 | 1)[]>
  >("sima.modelador.cardinality-minimums.v1", {});
  const [attributeMarks, setAttributeMarks] = usePersistentState<Record<string, AttributeMark>>(
    "sima.modelador.attribute-marks.v1",
    {},
  );
  const [domains, setDomains] = usePersistentState<Record<string, string>>(
    "sima.modelador.domains.v1",
    {},
  );
  const [relationAttributes, setRelationAttributes] = usePersistentState<Record<string, string[]>>(
    "sima.modelador.relation-attributes.v1",
    {},
  );
  const [hierarchyRequest, setHierarchyRequest] = useState(0);
  const [arrangeRequest, setArrangeRequest] = useState(0);
  const [canvasEditRequest, setCanvasEditRequest] = useState<{
    entity: string;
    attribute?: string;
    token: number;
  } | null>(null);
  const [entityRenameRequest, setEntityRenameRequest] = useState<{
    oldName: string;
    newName: string;
    token: number;
  } | null>(null);
  const model = useMemo(() => toDiagram({ tables, warnings: [] }), [tables]);
  const outputDDL = useMemo(() => generateDDL(tables), [tables]);
  const createRelation = (draft: RelationDraft): boolean => {
    const source = tables.find((table) => table.name === draft.source);
    const target = tables.find((table) => table.name === draft.target);
    if (!source || !target || !source.primaryKey.length || !target.primaryKey.length) return false;
    const columnsFor = (
      owner: Table,
      referenced: Table,
      mandatory: boolean,
    ): { columns: Column[]; foreignKey: ForeignKey } => {
      const keyColumns = referenced.primaryKey
        .map((name) =>
          referenced.columns.find((column) => column.name.toLowerCase() === name.toLowerCase()),
        )
        .filter((column): column is Column => Boolean(column));
      const columns = keyColumns.map((keyColumn) => {
        const base = `${referenced.name.toLowerCase()}_${keyColumn.name}`;
        let name = base;
        let suffix = 2;
        while (owner.columns.some((column) => column.name.toLowerCase() === name.toLowerCase()))
          name = `${base}_${suffix++}`;
        return {
          name,
          type: keyColumn.type,
          nullable: !mandatory,
          primaryKey: false,
          unique: draft.kind === "1:1" && keyColumns.length === 1,
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
    };
    if (draft.participants.length >= 3) {
      const participants = draft.participants.map((name) =>
        tables.find((table) => table.name === name),
      );
      if (
        participants.some((table): table is undefined => !table) ||
        new Set(draft.participants.map((name) => name.toLowerCase())).size !==
          draft.participants.length
      )
        return false;
      const relationName = draft.name.trim();
      if (
        !relationName ||
        tables.some((table) => table.name.toLowerCase() === relationName.toLowerCase())
      )
        return false;
      let accumulated: Column[] = [];
      const foreignKeys: ForeignKey[] = [];
      for (const participant of participants as Table[]) {
        const addition = columnsFor(
          { ...participant, name: relationName, columns: accumulated },
          participant,
          true,
        );
        accumulated = [
          ...accumulated,
          ...addition.columns.map((column) => ({ ...column, primaryKey: true, nullable: false })),
        ];
        foreignKeys.push(addition.foreignKey);
      }
      const extra = (draft.attributes ?? []).map((name) => ({
        name,
        type: "TEXT",
        nullable: true,
        primaryKey: false,
        unique: false,
      }));
      if (
        new Set([...accumulated, ...extra].map((column) => column.name.toLowerCase())).size !==
        accumulated.length + extra.length
      )
        return false;
      setTables([
        ...tables,
        {
          name: relationName,
          columns: [...accumulated, ...extra],
          primaryKey: accumulated.map((column) => column.name),
          uniqueKeys: [],
          foreignKeys,
          checks: [],
        },
      ]);
      if (draft.participantMinimums)
        setCardinalityMinimums((current) => ({
          ...current,
          [`assoc:${relationName.toLowerCase()}`]: draft.participantMinimums!,
        }));
      return true;
    }
    if (draft.kind === "N:M") {
      const relationName = draft.name.trim() || `${source.name}_${target.name}`;
      if (tables.some((table) => table.name.toLowerCase() === relationName.toLowerCase()))
        return false;
      const first = columnsFor({ ...source, columns: [] }, source, true);
      const second = columnsFor({ ...target, columns: first.columns }, target, true);
      if (draft.roles) {
        first.foreignKey.roles = draft.roles;
        second.foreignKey.roles = draft.roles;
      }
      if (draft.participantMaximums) {
        first.foreignKey.participantMaximums = draft.participantMaximums;
        second.foreignKey.participantMaximums = draft.participantMaximums;
      }
      const columns = [...first.columns, ...second.columns].map((column) => ({
        ...column,
        primaryKey: true,
        nullable: false,
      }));
      const foreignKeys = [first.foreignKey, second.foreignKey];
      const extra = (draft.attributes ?? []).map((name) => ({
        name,
        type: "TEXT",
        nullable: true,
        primaryKey: false,
        unique: false,
      }));
      if (
        new Set([...columns, ...extra].map((column) => column.name.toLowerCase())).size !==
        columns.length + extra.length
      )
        return false;
      setTables([
        ...tables,
        {
          name: relationName,
          columns: [...columns, ...extra],
          primaryKey: columns.map((column) => column.name),
          uniqueKeys: [],
          foreignKeys,
          checks: [],
        },
      ]);
      if (draft.participantMinimums)
        setCardinalityMinimums((current) => ({
          ...current,
          [`assoc:${relationName.toLowerCase()}`]: draft.participantMinimums!,
        }));
      return true;
    }
    const owner = target;
    const referenced = source;
    const addition = columnsFor(owner, referenced, draft.mandatory);
    if (draft.roles) addition.foreignKey.roles = draft.roles;
    if (draft.participantMaximums)
      addition.foreignKey.participantMaximums = draft.participantMaximums;
    const extra = (draft.attributes ?? []).map((name) => ({
      name,
      type: "TEXT",
      nullable: true,
      primaryKey: false,
      unique: false,
    }));
    if (
      new Set(
        [...owner.columns, ...addition.columns, ...extra].map((column) =>
          column.name.toLowerCase(),
        ),
      ).size !==
      owner.columns.length + addition.columns.length + extra.length
    )
      return false;
    const nextColumns = [...owner.columns, ...addition.columns, ...extra];
    const nextTable = {
      ...owner,
      columns: nextColumns,
      uniqueKeys:
        draft.kind === "1:1"
          ? [...owner.uniqueKeys, addition.foreignKey.columns]
          : owner.uniqueKeys,
      foreignKeys: [...owner.foreignKeys, addition.foreignKey],
    };
    setTables(tables.map((table) => (table.name === owner.name ? nextTable : table)));
    const relationId = `fk:${owner.name.toLowerCase()}:${addition.foreignKey.columns.join(",").toLowerCase()}`;
    setNames((current) => ({
      ...current,
      [relationId]: draft.name.trim() || `${referenced.name}_${owner.name}`,
    }));
    if (draft.participantMinimums)
      setCardinalityMinimums((current) => ({
        ...current,
        [relationId]: draft.participantMinimums!,
      }));
    setRelationAttributes((current) => ({ ...current, [relationId]: draft.attributes ?? [] }));
    return true;
  };
  const updateRelationRoles = (id: string, roles: [string, string]) => {
    if (id.startsWith("assoc:")) {
      const tableName = id.slice("assoc:".length);
      setTables((current) =>
        current.map((table) =>
          table.name.toLowerCase() === tableName
            ? {
                ...table,
                foreignKeys: table.foreignKeys.map((foreignKey) => ({ ...foreignKey, roles })),
              }
            : table,
        ),
      );
      return;
    }
    const match = id.match(/^fk:([^:]+):(.+)$/);
    if (!match) return;
    const [, ownerName, fkColumns] = match;
    setTables((current) =>
      current.map((table) =>
        table.name.toLowerCase() === ownerName
          ? {
              ...table,
              foreignKeys: table.foreignKeys.map((foreignKey) =>
                foreignKey.columns.map((column) => column.toLowerCase()).join(",") === fkColumns
                  ? { ...foreignKey, roles }
                  : foreignKey,
              ),
            }
          : table,
      ),
    );
  };
  const editRelation = (
    id: string,
    changes: {
      kind?: RelationDraft["kind"];
      mandatory?: boolean;
      weakCardinality?: import("./parser/ddlParser").WeakCardinality;
    },
  ): boolean => {
    const relation = model.relations.find((item) => item.id === id);
    const match = id.match(/^fk:([^:]+):(.+)$/);
    if (!relation || !match || relation.kind === "N:M") return false;
    const [, ownerName, fkColumns] = match;
    if (changes.weakCardinality && relation.dependency) {
      const owner = tables.find((table) => table.name.toLowerCase() === ownerName);
      const foreignKey = owner?.foreignKeys.find(
        (item) => item.columns.map((column) => column.toLowerCase()).join(",") === fkColumns,
      );
      if (!owner || !foreignKey) return false;
      const identifying = foreignKey.dependency === "ID";
      const maxOne = changes.weakCardinality.endsWith(":1");
      const partialIdentifier = foreignKey.partialIdentifier;
      let columns = owner.columns.filter(
        (column) =>
          !(
            identifying &&
            partialIdentifier &&
            column.name.toLowerCase() === partialIdentifier.toLowerCase()
          ),
      );
      columns = columns.map((column) =>
        foreignKey.columns.some((name) => name.toLowerCase() === column.name.toLowerCase())
          ? { ...column, nullable: false, primaryKey: identifying }
          : column,
      );
      const uniqueKeys = owner.uniqueKeys.filter(
        (key) => key.map((column) => column.toLowerCase()).join(",") !== fkColumns,
      );
      if (!identifying && maxOne) uniqueKeys.push(foreignKey.columns);
      const foreignKeys = owner.foreignKeys.map((item) => {
        if (item !== foreignKey) return item;
        const next = { ...item, weakCardinality: changes.weakCardinality };
        delete next.partialIdentifier;
        return next;
      });
      setTables(
        tables.map((table) =>
          table.name.toLowerCase() === ownerName
            ? {
                ...table,
                columns,
                primaryKey: columns
                  .filter((column) => column.primaryKey)
                  .map((column) => column.name),
                uniqueKeys,
                foreignKeys,
              }
            : table,
        ),
      );
      return true;
    }
    const owner = tables.find((table) => table.name.toLowerCase() === ownerName);
    if (!owner) return false;
    const columns = fkColumns.split(",");
    const foreignKey = owner.foreignKeys.find(
      (item) => item.columns.map((column) => column.toLowerCase()).join(",") === fkColumns,
    );
    if (!foreignKey) return false;
    const uniqueKeys = owner.uniqueKeys.filter(
      (key) => key.map((column) => column.toLowerCase()).join(",") !== columns.join(","),
    );
    const nextKind = changes.kind ?? relation.kind;
    if (nextKind === "1:1") uniqueKeys.push(foreignKey.columns);
    const dependency =
      changes.mandatory === undefined ? foreignKey.dependency : changes.mandatory ? "E" : undefined;
    const nextColumns = owner.columns.map((column) =>
      foreignKey.columns.some((name) => name.toLowerCase() === column.name.toLowerCase())
        ? {
            ...column,
            ...(changes.mandatory !== undefined ? { nullable: !changes.mandatory } : {}),
            ...(column.foreignKey ? { foreignKey: { ...column.foreignKey, dependency } } : {}),
          }
        : column,
    );
    const foreignKeys = owner.foreignKeys.map((item) =>
      item === foreignKey ? { ...item, dependency } : item,
    );
    setTables(
      tables.map((table) =>
        table.name.toLowerCase() === ownerName
          ? { ...table, columns: nextColumns, uniqueKeys, foreignKeys }
          : table,
      ),
    );
    return true;
  };
  const renameEntity = (oldName: string, newName: string): boolean => {
    const nextName = newName.trim();
    if (
      !nextName ||
      (nextName.toLowerCase() !== oldName.toLowerCase() &&
        tables.some((table) => table.name.toLowerCase() === nextName.toLowerCase()))
    )
      return false;
    setTables(
      tables.map((table) => {
        if (table.name === oldName) return { ...table, name: nextName };
        return {
          ...table,
          columns: table.columns.map((column) =>
            column.foreignKey?.table === oldName
              ? { ...column, foreignKey: { ...column.foreignKey, table: nextName } }
              : column,
          ),
          foreignKeys: table.foreignKeys.map((fk) =>
            fk.table === oldName ? { ...fk, table: nextName } : fk,
          ),
        };
      }),
    );
    if (oldName !== nextName) {
      setAttributeMarks(
        Object.fromEntries(
          Object.entries(attributeMarks).map(([key, value]) => [
            key.startsWith(`${oldName}.`) ? `${nextName}.${key.slice(oldName.length + 1)}` : key,
            value,
          ]),
        ),
      );
      setDomains(
        Object.fromEntries(
          Object.entries(domains).map(([key, value]) => [
            key.startsWith(`${oldName}.`) ? `${nextName}.${key.slice(oldName.length + 1)}` : key,
            value,
          ]),
        ),
      );
    }
    return true;
  };
  const deleteEntity = (name: string) => {
    const removedNames = new Set([name.toLowerCase()]);
    let found = true;
    while (found) {
      found = false;
      for (const table of tables)
        if (
          !removedNames.has(table.name.toLowerCase()) &&
          table.foreignKeys.some(
            (fk) =>
              removedNames.has(fk.table.toLowerCase()) &&
              Boolean(fk.weakCardinality) &&
              (fk.dependency === "E" || fk.dependency === "ID"),
          )
        ) {
          removedNames.add(table.name.toLowerCase());
          found = true;
        }
    }
    const nextTables = tables
      .filter((table) => !removedNames.has(table.name.toLowerCase()))
      .map((table) => {
        const removedFks = table.foreignKeys.filter((fk) =>
          removedNames.has(fk.table.toLowerCase()),
        );
        const removedColumns = new Set(
          removedFks.flatMap((fk) => fk.columns.map((column) => column.toLowerCase())),
        );
        const columns = table.columns
          .filter((column) => !removedColumns.has(column.name.toLowerCase()))
          .map((column) =>
            column.foreignKey && removedNames.has(column.foreignKey.table.toLowerCase())
              ? { ...column, foreignKey: undefined }
              : column,
          );
        return {
          ...table,
          columns,
          primaryKey: table.primaryKey.filter((column) =>
            columns.some((item) => item.name.toLowerCase() === column.toLowerCase()),
          ),
          uniqueKeys: table.uniqueKeys.filter((key) =>
            key.every((column) =>
              columns.some((item) => item.name.toLowerCase() === column.toLowerCase()),
            ),
          ),
          foreignKeys: table.foreignKeys.filter((fk) => !removedNames.has(fk.table.toLowerCase())),
        };
      });
    setTables(nextTables);
    const validKeys = new Set(
      nextTables.flatMap((table) =>
        table.columns.map((column) => `${table.name}.${column.name}`.toLowerCase()),
      ),
    );
    setAttributeMarks(
      Object.fromEntries(
        Object.entries(attributeMarks).filter(([key]) => validKeys.has(key.toLowerCase())),
      ),
    );
    setDomains(
      Object.fromEntries(
        Object.entries(domains).filter(([key]) => validKeys.has(key.toLowerCase())),
      ),
    );
  };
  const addAttribute = (tableName: string): string | null => {
    const table = tables.find((item) => item.name === tableName);
    if (!table) return null;
    let name = `atributo_${table.columns.length + 1}`;
    let suffix = 2;
    while (table.columns.some((column) => column.name.toLowerCase() === name.toLowerCase()))
      name = `atributo_${table.columns.length + suffix++}`;
    setTables(
      tables.map((item) =>
        item.name === tableName
          ? {
              ...item,
              columns: [
                ...item.columns,
                { name, type: "TEXT", nullable: true, primaryKey: false, unique: false },
              ],
            }
          : item,
      ),
    );
    return name;
  };
  const editAttribute = (tableName: string, oldName: string, changes: Partial<Column>): boolean => {
    const table = tables.find((item) => item.name === tableName);
    if (!table) return false;
    const nextName = changes.name?.trim() ?? oldName;
    if (
      !nextName ||
      (nextName.toLowerCase() !== oldName.toLowerCase() &&
        table.columns.some((column) => column.name.toLowerCase() === nextName.toLowerCase()))
    )
      return false;
    const columns = table.columns.map((column) =>
      column.name === oldName
        ? {
            ...column,
            ...changes,
            name: nextName,
            unique:
              (changes.alternateKey ?? column.alternateKey)
                ? true
                : (changes.unique ?? column.unique),
          }
        : column,
    );
    if (!columns.some((column) => column.primaryKey)) return false;
    const mapColumn = (column: string) =>
      column.toLowerCase() === oldName.toLowerCase() ? nextName : column;
    const uniqueKeys = table.uniqueKeys
      .map((key) => key.map(mapColumn))
      .filter((key) => key.length);
    if (changes.unique !== undefined || changes.alternateKey !== undefined) {
      const enabled = columns.find((column) => column.name === nextName)?.unique;
      const without = uniqueKeys.filter(
        (key) => !(key.length === 1 && key[0].toLowerCase() === nextName.toLowerCase()),
      );
      uniqueKeys.splice(0, uniqueKeys.length, ...without, ...(enabled ? [[nextName]] : []));
    }
    setTables(
      tables.map((item) =>
        item.name !== tableName
          ? item
          : {
              ...item,
              columns: columns.map((column) =>
                column.foreignKey?.table === tableName
                  ? {
                      ...column,
                      foreignKey: {
                        ...column.foreignKey,
                        columns: column.foreignKey.columns?.map(mapColumn),
                      },
                    }
                  : column,
              ),
              primaryKey: columns
                .filter((column) => column.primaryKey)
                .map((column) => column.name),
              uniqueKeys,
              foreignKeys: item.foreignKeys.map((fk) => ({
                ...fk,
                columns: fk.columns.map(mapColumn),
                targetColumns:
                  fk.table === tableName ? fk.targetColumns?.map(mapColumn) : fk.targetColumns,
              })),
            },
      ),
    );
    if (oldName !== nextName) {
      const oldKey = `${tableName}.${oldName}`,
        newKey = `${tableName}.${nextName}`;
      if (attributeMarks[oldKey]) {
        const next = { ...attributeMarks, [newKey]: attributeMarks[oldKey] };
        delete next[oldKey];
        setAttributeMarks(next);
      }
      if (domains[oldKey]) {
        const next = { ...domains, [newKey]: domains[oldKey] };
        delete next[oldKey];
        setDomains(next);
      }
    }
    return true;
  };
  const deleteAttribute = (tableName: string, name: string): boolean => {
    const table = tables.find((item) => item.name === tableName);
    if (!table) return false;
    const column = table.columns.find((item) => item.name === name);
    if (
      !column ||
      (column.primaryKey && table.primaryKey.length <= 1) ||
      tables.some((item) =>
        item.foreignKeys.some(
          (fk) => fk.table === tableName && (fk.targetColumns ?? []).includes(name),
        ),
      )
    )
      return false;
    setTables(
      tables.map((item) =>
        item.name !== tableName
          ? item
          : {
              ...item,
              columns: item.columns.filter((candidate) => candidate.name !== name),
              primaryKey: item.primaryKey.filter((candidate) => candidate !== name),
              uniqueKeys: item.uniqueKeys.filter(
                (key) => !key.some((candidate) => candidate === name),
              ),
              foreignKeys: item.foreignKeys.filter((fk) => !fk.columns.includes(name)),
            },
      ),
    );
    const key = `${tableName}.${name}`;
    const marks = { ...attributeMarks };
    const domainMap = { ...domains };
    delete marks[key];
    delete domainMap[key];
    setAttributeMarks(marks);
    setDomains(domainMap);
    return true;
  };
  const deleteRelation = (id: string) => {
    const relation = model.relations.find((item) => item.id === id);
    if (!relation) return;
    if (relation.dependency && relation.weakCardinality) {
      deleteEntity(relation.right);
      setNames((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setRelationAttributes((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    if (relation.kind === "N:M") {
      setTables(tables.filter((table) => table.name.toLowerCase() !== relation.name.toLowerCase()));
      const validKeys = new Set(
        tables
          .filter((table) => table.name.toLowerCase() !== relation.name.toLowerCase())
          .flatMap((table) =>
            table.columns.map((column) => `${table.name}.${column.name}`.toLowerCase()),
          ),
      );
      setAttributeMarks(
        Object.fromEntries(
          Object.entries(attributeMarks).filter(([key]) => validKeys.has(key.toLowerCase())),
        ),
      );
      setDomains(
        Object.fromEntries(
          Object.entries(domains).filter(([key]) => validKeys.has(key.toLowerCase())),
        ),
      );
      setNames((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    const match = id.match(/^fk:([^:]+):(.+)$/);
    if (!match) return;
    const [, ownerName, fkColumns] = match;
    setTables(
      tables.map((table) => {
        if (table.name.toLowerCase() !== ownerName) return table;
        const fk = table.foreignKeys.find(
          (item) => item.columns.map((column) => column.toLowerCase()).join(",") === fkColumns,
        );
        if (!fk) return table;
        const removed = new Set(
          [...fk.columns, ...(relationAttributes[id] ?? [])].map((column) => column.toLowerCase()),
        );
        return {
          ...table,
          columns: table.columns.filter((column) => !removed.has(column.name.toLowerCase())),
          primaryKey: table.primaryKey.filter((column) => !removed.has(column.toLowerCase())),
          uniqueKeys: table.uniqueKeys.filter(
            (key) => !key.some((column) => removed.has(column.toLowerCase())),
          ),
          foreignKeys: table.foreignKeys.filter((item) => item !== fk),
        };
      }),
    );
    setNames((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setRelationAttributes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };
  return (
    <main className="app app-shell">
      <header className="topbar">
        <div className="brand-mark">P</div>
        <div>
          <p className="eyebrow">DATABASE EMULATOR</p>
          <h1>Diseña tu modelo de datos</h1>
        </div>
      </header>
      <section className="workspace design-workspace app-workspace">
        <aside className="statement-panel">
          <header>
            <div>
              <h2>Enunciado del ejercicio</h2>
              <p>Describe aquí el problema que vas a modelar.</p>
            </div>
          </header>
          <textarea
            value={exerciseStatement}
            onChange={(event) => setExerciseStatement(event.target.value)}
            placeholder="Escribe el enunciado del ejercicio…"
            aria-label="Enunciado del ejercicio"
          />
          <small>
            Se guardará automáticamente y aparecerá antes de la solución al exportar el PDF.
          </small>
        </aside>
        <section className="visualizer">
          <nav className="tabs" role="tablist" aria-label="Modelos">
            <button
              role="tab"
              aria-selected={tab === "conceptual"}
              onClick={() => setTab("conceptual")}
            >
              Modelo conceptual <span>MER</span>
            </button>
            <button role="tab" aria-selected={tab === "logical"} onClick={() => setTab("logical")}>
              Modelo lógico
            </button>
            <button role="tab" aria-selected={tab === "ddl"} onClick={() => setTab("ddl")}>
              DDL generado
            </button>
            <span className="counts">
              {model.entities.length} entidades · {model.relations.length} relaciones
            </span>
          </nav>
          <div style={{ display: tab === "ddl" ? "none" : "contents" }} aria-hidden={tab === "ddl"}>
            <Diagram
              model={model}
              conceptual={tab === "conceptual"}
              exerciseStatement={exerciseStatement}
              cardinalityMinimums={cardinalityMinimums}
              setCardinalityMinimums={setCardinalityMinimums}
              names={names}
              rename={(id, value) => setNames((p) => ({ ...p, [id]: value }))}
              editRelation={editRelation}
              updateRelationRoles={updateRelationRoles}
              attributeMarks={attributeMarks}
              setAttributeMarks={setAttributeMarks}
              domains={domains}
              setDomains={setDomains}
              createRelation={createRelation}
              hierarchyRequest={hierarchyRequest}
              arrangeRequest={arrangeRequest}
              renameEntity={renameEntity}
              requestEntityEdit={(name, attribute) =>
                setCanvasEditRequest((current) => ({
                  entity: name,
                  attribute,
                  token: (current?.token ?? 0) + 1,
                }))
              }
              entityRenameRequest={entityRenameRequest}
              deleteEntity={deleteEntity}
              addAttribute={addAttribute}
              editAttribute={editAttribute}
              deleteAttribute={deleteAttribute}
              deleteRelation={deleteRelation}
            />
          </div>
          {tab === "ddl" && <DDLPreview source={outputDDL} />}
        </section>
      </section>
      <div className="bottom-dock" aria-label="Herramientas para crear el modelo">
        <Designer
          tables={tables}
          onChange={setTables}
          attributeMarks={attributeMarks}
          setAttributeMarks={setAttributeMarks}
          domains={domains}
          setDomains={setDomains}
          createRelation={createRelation}
          requestHierarchy={() => setHierarchyRequest((value) => value + 1)}
          requestArrange={() => setArrangeRequest((value) => value + 1)}
          renameEntity={renameEntity}
          deleteEntity={deleteEntity}
          addAttribute={addAttribute}
          editAttribute={editAttribute}
          deleteAttribute={deleteAttribute}
          editRequest={canvasEditRequest}
          onEditRequestHandled={(token) =>
            setCanvasEditRequest((current) => (current?.token === token ? null : current))
          }
          onEntityRenamed={(oldName, newName) =>
            setEntityRenameRequest((current) => ({
              oldName,
              newName,
              token: (current?.token ?? 0) + 1,
            }))
          }
        />
      </div>
    </main>
  );
}

function DDLPreview({ source }: { source: string }) {
  const [message, setMessage] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setMessage("DDL copiado");
    } catch {
      setMessage("No se pudo copiar; selecciona el texto para copiarlo.");
    }
  };
  return (
    <section className="ddl-preview">
      <header>
        <div>
          <h2>DDL de PostgreSQL</h2>
          <p>Generado a partir de las entidades y relaciones del modelo.</p>
        </div>
        <div>
          <button type="button" onClick={() => void copy()}>
            Copiar
          </button>
        </div>
      </header>
      <textarea
        readOnly
        aria-label="DDL generado"
        value={source}
        placeholder="Añade una entidad para generar el DDL."
      />
      <small>{message || "El DDL se actualiza automáticamente."}</small>
    </section>
  );
}

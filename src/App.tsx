import { useMemo, useState } from "react";
import { toDiagram } from "./model";
import { Diagram } from "./Diagram";
import { Designer } from "./Designer";
import { generateDDL } from "./generateDDL";
import type { Column, ForeignKey, Table } from "./parser/ddlParser";
import type { AttributeMark, RelationDraft } from "./model";
import { usePersistentState } from "./persistence";
export function App() {
  const [tables, setTables] = usePersistentState<Table[]>("sima.modelador.tables.v1", []); const [tab, setTab] = usePersistentState<"conceptual" | "logical" | "ddl">("sima.modelador.tab.v1", "conceptual"); const minimum = 1; const [names, setNames] = usePersistentState<Record<string, string>>("sima.modelador.relation-names.v1", {}); const [attributeMarks, setAttributeMarks] = usePersistentState<Record<string, AttributeMark>>("sima.modelador.attribute-marks.v1", {}); const [domains, setDomains] = usePersistentState<Record<string, string>>("sima.modelador.domains.v1", {}); const [relationAttributes, setRelationAttributes] = usePersistentState<Record<string, string[]>>("sima.modelador.relation-attributes.v1", {}); const [hierarchyRequest, setHierarchyRequest] = useState(0); const [arrangeRequest, setArrangeRequest] = useState(0);
  const model = useMemo(() => toDiagram({ tables, warnings: [] }), [tables]);
  const outputDDL = useMemo(() => generateDDL(tables), [tables]);
  const createRelation = (draft: RelationDraft): boolean => {
    const source = tables.find(table => table.name === draft.source); const target = tables.find(table => table.name === draft.target);
    if (!source || !target || !source.primaryKey.length || !target.primaryKey.length) return false;
    const columnsFor = (owner: Table, referenced: Table, mandatory: boolean): { columns: Column[]; foreignKey: ForeignKey } => {
      const keyColumns = referenced.primaryKey.map(name => referenced.columns.find(column => column.name.toLowerCase() === name.toLowerCase())).filter((column): column is Column => Boolean(column));
      const columns = keyColumns.map(keyColumn => { const base = `${referenced.name.toLowerCase()}_${keyColumn.name}`; let name = base; let suffix = 2; while (owner.columns.some(column => column.name.toLowerCase() === name.toLowerCase())) name = `${base}_${suffix++}`; return { name, type: keyColumn.type, nullable: !mandatory, primaryKey: false, unique: draft.kind === "1:1" && keyColumns.length === 1, foreignKey: { table: referenced.name, columns: referenced.primaryKey } }; });
      return { columns, foreignKey: { columns: columns.map(column => column.name), table: referenced.name, targetColumns: referenced.primaryKey } };
    };
    if (draft.participants.length >= 3) {
      const participants = draft.participants.map(name => tables.find(table => table.name === name));
      if (participants.some((table): table is undefined => !table) || new Set(draft.participants.map(name => name.toLowerCase())).size !== draft.participants.length) return false;
      const relationName = draft.name.trim(); if (!relationName || tables.some(table => table.name.toLowerCase() === relationName.toLowerCase())) return false;
      let accumulated: Column[] = []; const foreignKeys: ForeignKey[] = [];
      for (const participant of participants as Table[]) { const addition = columnsFor({ ...participant, name: relationName, columns: accumulated }, participant, true); accumulated = [...accumulated, ...addition.columns.map(column => ({ ...column, primaryKey: true, nullable: false }))]; foreignKeys.push(addition.foreignKey); }
      const extra = (draft.attributes ?? []).map(name => ({ name, type: "TEXT", nullable: true, primaryKey: false, unique: false }));
      if (new Set([...accumulated, ...extra].map(column => column.name.toLowerCase())).size !== accumulated.length + extra.length) return false;
      setTables([...tables, { name: relationName, columns: [...accumulated, ...extra], primaryKey: accumulated.map(column => column.name), uniqueKeys: [], foreignKeys, checks: [] }]);
      return true;
    }
    if (draft.kind === "N:M") {
      const relationName = draft.name.trim() || `${source.name}_${target.name}`; if (tables.some(table => table.name.toLowerCase() === relationName.toLowerCase())) return false;
      const first = columnsFor({ ...source, columns: [] }, source, true); const second = columnsFor({ ...target, columns: first.columns }, target, true);
      const columns = [...first.columns, ...second.columns].map(column => ({ ...column, primaryKey: true, nullable: false })); const foreignKeys = [first.foreignKey, second.foreignKey];
      const extra = (draft.attributes ?? []).map(name => ({ name, type: "TEXT", nullable: true, primaryKey: false, unique: false }));
      if (new Set([...columns, ...extra].map(column => column.name.toLowerCase())).size !== columns.length + extra.length) return false;
      setTables([...tables, { name: relationName, columns: [...columns, ...extra], primaryKey: columns.map(column => column.name), uniqueKeys: [], foreignKeys, checks: [] }]);
      return true;
    }
    const owner = target; const referenced = source; const addition = columnsFor(owner, referenced, draft.mandatory);
    const extra = (draft.attributes ?? []).map(name => ({ name, type: "TEXT", nullable: true, primaryKey: false, unique: false }));
    if (new Set([...owner.columns, ...addition.columns, ...extra].map(column => column.name.toLowerCase())).size !== owner.columns.length + addition.columns.length + extra.length) return false;
    const nextColumns = [...owner.columns, ...addition.columns, ...extra]; const nextTable = { ...owner, columns: nextColumns, uniqueKeys: draft.kind === "1:1" ? [...owner.uniqueKeys, addition.foreignKey.columns] : owner.uniqueKeys, foreignKeys: [...owner.foreignKeys, addition.foreignKey] };
    setTables(tables.map(table => table.name === owner.name ? nextTable : table));
    const relationId = `fk:${owner.name.toLowerCase()}:${addition.foreignKey.columns.join(",").toLowerCase()}`;
    setNames(current => ({ ...current, [relationId]: draft.name.trim() || `${referenced.name}_${owner.name}` }));
    setRelationAttributes(current => ({ ...current, [relationId]: draft.attributes ?? [] }));
    return true;
  };
  const renameEntity = (oldName: string, newName: string): boolean => {
    const nextName = newName.trim();
    if (!nextName || (nextName.toLowerCase() !== oldName.toLowerCase() && tables.some(table => table.name.toLowerCase() === nextName.toLowerCase()))) return false;
    setTables(tables.map(table => {
      if (table.name === oldName) return { ...table, name: nextName };
      return { ...table, columns: table.columns.map(column => column.foreignKey?.table === oldName ? { ...column, foreignKey: { ...column.foreignKey, table: nextName } } : column), foreignKeys: table.foreignKeys.map(fk => fk.table === oldName ? { ...fk, table: nextName } : fk) };
    }));
    if (oldName !== nextName) { setAttributeMarks(Object.fromEntries(Object.entries(attributeMarks).map(([key, value]) => [key.startsWith(`${oldName}.`) ? `${nextName}.${key.slice(oldName.length + 1)}` : key, value]))); setDomains(Object.fromEntries(Object.entries(domains).map(([key, value]) => [key.startsWith(`${oldName}.`) ? `${nextName}.${key.slice(oldName.length + 1)}` : key, value]))); }
    return true;
  };
  const deleteEntity = (name: string) => {
    const nextTables = tables.filter(table => table.name !== name).map(table => {
      const removedFks = table.foreignKeys.filter(fk => fk.table.toLowerCase() === name.toLowerCase());
      const removedColumns = new Set(removedFks.flatMap(fk => fk.columns.map(column => column.toLowerCase())));
      const columns = table.columns.filter(column => !removedColumns.has(column.name.toLowerCase())).map(column => column.foreignKey?.table.toLowerCase() === name.toLowerCase() ? { ...column, foreignKey: undefined } : column);
      return { ...table, columns, primaryKey: table.primaryKey.filter(column => columns.some(item => item.name.toLowerCase() === column.toLowerCase())), uniqueKeys: table.uniqueKeys.filter(key => key.every(column => columns.some(item => item.name.toLowerCase() === column.toLowerCase()))), foreignKeys: table.foreignKeys.filter(fk => fk.table.toLowerCase() !== name.toLowerCase()) };
    });
    setTables(nextTables);
    const validKeys = new Set(nextTables.flatMap(table => table.columns.map(column => `${table.name}.${column.name}`.toLowerCase())));
    setAttributeMarks(Object.fromEntries(Object.entries(attributeMarks).filter(([key]) => validKeys.has(key.toLowerCase())))); setDomains(Object.fromEntries(Object.entries(domains).filter(([key]) => validKeys.has(key.toLowerCase()))));
  };
  const addAttribute = (tableName: string): string | null => {
    const table = tables.find(item => item.name === tableName); if (!table) return null;
    let name = `atributo_${table.columns.length + 1}`; let suffix = 2;
    while (table.columns.some(column => column.name.toLowerCase() === name.toLowerCase())) name = `atributo_${table.columns.length + suffix++}`;
    setTables(tables.map(item => item.name === tableName ? { ...item, columns: [...item.columns, { name, type: "TEXT", nullable: true, primaryKey: false, unique: false }] } : item));
    return name;
  };
  const editAttribute = (tableName: string, oldName: string, changes: Partial<Column>): boolean => {
    const table = tables.find(item => item.name === tableName); if (!table) return false;
    const nextName = changes.name?.trim() ?? oldName;
    if (!nextName || (nextName.toLowerCase() !== oldName.toLowerCase() && table.columns.some(column => column.name.toLowerCase() === nextName.toLowerCase()))) return false;
    const columns = table.columns.map(column => column.name === oldName ? { ...column, ...changes, name: nextName, unique: (changes.alternateKey ?? column.alternateKey) ? true : changes.unique ?? column.unique } : column);
    if (!columns.some(column => column.primaryKey)) return false;
    const mapColumn = (column: string) => column.toLowerCase() === oldName.toLowerCase() ? nextName : column;
    const uniqueKeys = table.uniqueKeys.map(key => key.map(mapColumn)).filter(key => key.length);
    if (changes.unique !== undefined || changes.alternateKey !== undefined) {
      const enabled = columns.find(column => column.name === nextName)?.unique;
      const without = uniqueKeys.filter(key => !(key.length === 1 && key[0].toLowerCase() === nextName.toLowerCase()));
      uniqueKeys.splice(0, uniqueKeys.length, ...without, ...(enabled ? [[nextName]] : []));
    }
    setTables(tables.map(item => item.name !== tableName ? item : { ...item, columns: columns.map(column => column.foreignKey?.table === tableName ? { ...column, foreignKey: { ...column.foreignKey, columns: column.foreignKey.columns?.map(mapColumn) } } : column), primaryKey: columns.filter(column => column.primaryKey).map(column => column.name), uniqueKeys, foreignKeys: item.foreignKeys.map(fk => ({ ...fk, columns: fk.columns.map(mapColumn), targetColumns: fk.table === tableName ? fk.targetColumns?.map(mapColumn) : fk.targetColumns })) }));
    if (oldName !== nextName) { const oldKey = `${tableName}.${oldName}`, newKey = `${tableName}.${nextName}`; if (attributeMarks[oldKey]) { const next = { ...attributeMarks, [newKey]: attributeMarks[oldKey] }; delete next[oldKey]; setAttributeMarks(next); } if (domains[oldKey]) { const next = { ...domains, [newKey]: domains[oldKey] }; delete next[oldKey]; setDomains(next); } }
    return true;
  };
  const deleteAttribute = (tableName: string, name: string): boolean => {
    const table = tables.find(item => item.name === tableName); if (!table) return false;
    const column = table.columns.find(item => item.name === name); if (!column || (column.primaryKey && table.primaryKey.length <= 1) || tables.some(item => item.foreignKeys.some(fk => fk.table === tableName && (fk.targetColumns ?? []).includes(name)))) return false;
    setTables(tables.map(item => item.name !== tableName ? item : { ...item, columns: item.columns.filter(candidate => candidate.name !== name), primaryKey: item.primaryKey.filter(candidate => candidate !== name), uniqueKeys: item.uniqueKeys.filter(key => !key.some(candidate => candidate === name)), foreignKeys: item.foreignKeys.filter(fk => !fk.columns.includes(name)) }));
    const key = `${tableName}.${name}`; const marks = { ...attributeMarks }; const domainMap = { ...domains }; delete marks[key]; delete domainMap[key]; setAttributeMarks(marks); setDomains(domainMap); return true;
  };
  const deleteRelation = (id: string) => {
    const relation = model.relations.find(item => item.id === id); if (!relation) return;
    if (relation.kind === "N:M") { setTables(tables.filter(table => table.name.toLowerCase() !== relation.name.toLowerCase())); const validKeys = new Set(tables.filter(table => table.name.toLowerCase() !== relation.name.toLowerCase()).flatMap(table => table.columns.map(column => `${table.name}.${column.name}`.toLowerCase()))); setAttributeMarks(Object.fromEntries(Object.entries(attributeMarks).filter(([key]) => validKeys.has(key.toLowerCase())))); setDomains(Object.fromEntries(Object.entries(domains).filter(([key]) => validKeys.has(key.toLowerCase())))); setNames(current => { const next = { ...current }; delete next[id]; return next; }); return; }
    const match = id.match(/^fk:([^:]+):(.+)$/); if (!match) return;
    const [, ownerName, fkColumns] = match;
    setTables(tables.map(table => {
      if (table.name.toLowerCase() !== ownerName) return table;
      const fk = table.foreignKeys.find(item => item.columns.map(column => column.toLowerCase()).join(",") === fkColumns);
      if (!fk) return table;
      const removed = new Set([...fk.columns, ...(relationAttributes[id] ?? [])].map(column => column.toLowerCase()));
      return { ...table, columns: table.columns.filter(column => !removed.has(column.name.toLowerCase())), primaryKey: table.primaryKey.filter(column => !removed.has(column.toLowerCase())), uniqueKeys: table.uniqueKeys.filter(key => !key.some(column => removed.has(column.toLowerCase()))), foreignKeys: table.foreignKeys.filter(item => item !== fk) };
    }));
    setNames(current => { const next = { ...current }; delete next[id]; return next; });
    setRelationAttributes(current => { const next = { ...current }; delete next[id]; return next; });
  };
  return <main className="app"><header className="topbar"><div className="brand-mark">P</div><div><p className="eyebrow">DATABASE EMULATOR</p><h1>Diseña tu modelo de datos</h1></div></header>
    <section className="workspace design-workspace"><aside className="editor design-editor"><Designer tables={tables} onChange={setTables} attributeMarks={attributeMarks} setAttributeMarks={setAttributeMarks} domains={domains} setDomains={setDomains} createRelation={createRelation} requestHierarchy={() => setHierarchyRequest(value => value + 1)} requestArrange={() => setArrangeRequest(value => value + 1)} renameEntity={renameEntity} deleteEntity={deleteEntity} addAttribute={addAttribute} editAttribute={editAttribute} deleteAttribute={deleteAttribute}/></aside>
      <section className="visualizer"><nav className="tabs" role="tablist" aria-label="Modelos"><button role="tab" aria-selected={tab === "conceptual"} onClick={() => setTab("conceptual")}>Modelo conceptual <span>MER</span></button><button role="tab" aria-selected={tab === "logical"} onClick={() => setTab("logical")}>Modelo lógico</button><button role="tab" aria-selected={tab === "ddl"} onClick={() => setTab("ddl")}>DDL generado</button><span className="counts">{model.entities.length} entidades · {model.relations.length} relaciones</span></nav><div style={{ display: tab === "ddl" ? "none" : "contents" }} aria-hidden={tab === "ddl"}><Diagram model={model} conceptual={tab === "conceptual"} minimum={minimum} names={names} rename={(id, value) => setNames(p => ({ ...p, [id]: value }))} attributeMarks={attributeMarks} setAttributeMarks={setAttributeMarks} domains={domains} setDomains={setDomains} createRelation={createRelation} hierarchyRequest={hierarchyRequest} arrangeRequest={arrangeRequest} renameEntity={renameEntity} deleteEntity={deleteEntity} addAttribute={addAttribute} editAttribute={editAttribute} deleteAttribute={deleteAttribute} deleteRelation={deleteRelation}/></div>{tab === "ddl" && <DDLPreview source={outputDDL}/>}</section></section>
    <section className={`warnings ${model.warnings.length ? "warning-state" : "clear-state"}`}><div className="warning-heading"><span className="warning-icon">{model.warnings.length ? "!" : "✓"}</span><div><h2>Advertencias <span>{model.warnings.length}</span></h2><p>{model.warnings.length ? "Revisa estos elementos que no se pudieron inferir por completo." : "Sin advertencias. El DDL reconocido se representó correctamente."}</p></div></div>{model.warnings.length > 0 && <ul>{model.warnings.map((warning, i) => <li key={`${i}-${warning}`}>{warning}</li>)}</ul>}</section>
    <footer className="page-foot">Usa las herramientas del panel lateral para agregar entidades, interrelaciones y jerarquías. Desplaza el canvas arrastrando el fondo y acércate con la rueda del mouse. El modelo se guarda automáticamente en este navegador.</footer>
  </main>;
}

function DDLPreview({ source }: { source: string }) {
  const [message, setMessage] = useState("");
  const copy = async () => { try { await navigator.clipboard.writeText(source); setMessage("DDL copiado"); } catch { setMessage("No se pudo copiar; selecciona el texto para copiarlo."); } };
  const download = () => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([source], { type: "text/sql;charset=utf-8" })); link.download = "modelo.sql"; link.click(); window.setTimeout(() => URL.revokeObjectURL(link.href), 1000); };
  return <section className="ddl-preview"><header><div><h2>DDL de PostgreSQL</h2><p>Generado a partir de las entidades y relaciones del modelo.</p></div><div><button type="button" onClick={() => void copy()}>Copiar</button><button type="button" onClick={download}>Descargar .sql</button></div></header><textarea readOnly aria-label="DDL generado" value={source} placeholder="Añade una entidad para generar el DDL."/><small>{message || "El DDL se actualiza automáticamente."}</small></section>;
}

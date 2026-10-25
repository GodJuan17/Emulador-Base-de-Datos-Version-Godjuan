import { useMemo, useState } from "react";
import { toDiagram } from "./model";
import { Diagram } from "./Diagram";
import { Designer } from "./Designer";
import { DDLPreview } from "./features/ddl-view/DDLPreview";
import { generateDDL } from "./generateDDL";
import type { Column } from "./parser/ddlParser";
import type { RelationDraft } from "./model";
import { useAppState } from "./state/useAppState";
import {
  addAttribute as addAttributeOperation,
  deleteAttribute as deleteAttributeOperation,
  editAttribute as editAttributeOperation,
} from "./domain/operations/attributes";
import {
  deleteEntity as deleteEntityOperation,
  renameEntity as renameEntityOperation,
} from "./domain/operations/entities";
import { createRelation as createRelationOperation } from "./domain/operations/relations";
import {
  deleteRelation as deleteRelationOperation,
  editRelation as editRelationOperation,
  updateRelationRoles as updateRelationRolesOperation,
  type RelationEdit,
} from "./domain/operations/relationshipEditing";
import type { DomainState } from "./domain/operations/types";
export function App() {
  const appState = useAppState();
  const { state } = appState;
  const {
    exerciseStatement,
    tables,
    tab,
    names,
    cardinalityMinimums,
    attributeMarks,
    domains,
    relationAttributes,
    hierarchies,
    positions,
    view,
    collapsed,
  } = state;
  const setExerciseStatement = appState.set("exerciseStatement");
  const setTables = appState.set("tables");
  const setTab = appState.set("tab", false);
  const setNames = appState.set("names");
  const setCardinalityMinimums = appState.set("cardinalityMinimums");
  const setAttributeMarks = appState.set("attributeMarks");
  const setDomains = appState.set("domains");
  const setHierarchies = appState.set("hierarchies");
  const setPositions = appState.set("positions", false);
  const setView = appState.set("view", false);
  const setCollapsed = appState.set("collapsed", false);
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
  const model = useMemo(() => {
    const diagram = toDiagram({ tables, warnings: [] }, hierarchies);
    return {
      ...diagram,
      relations: diagram.relations.map((relation) => ({
        ...relation,
        attributes: relationAttributes[relation.id] ?? relation.attributes,
      })),
    };
  }, [tables, hierarchies, relationAttributes]);
  const outputDDL = useMemo(() => generateDDL(tables, hierarchies), [tables, hierarchies]);
  const createRelation = (draft: RelationDraft): boolean => {
    const result = createRelationOperation(domainState(), draft);
    if (!result.ok) return false;
    applyChanges(result.value);
    return true;
  };
  const updateRelationRoles = (id: string, roles: [string, string]) => {
    const result = updateRelationRolesOperation(domainState(), id, roles);
    if (result.ok) applyChanges(result.value);
  };
  const editRelation = (id: string, changes: RelationEdit): boolean => {
    const result = editRelationOperation(domainState(), model.relations, id, changes);
    if (!result.ok) return false;
    applyChanges(result.value);
    return true;
  };
  const domainState = (): DomainState => ({
    tables,
    attributeMarks,
    domains,
    names,
    cardinalityMinimums,
    relationAttributes,
  });
  const applyChanges = (changes: Partial<DomainState>) =>
    appState.update((current) => ({ ...current, ...changes }));
  const renameEntity = (oldName: string, newName: string): boolean => {
    const result = renameEntityOperation(domainState(), oldName, newName);
    if (!result.ok) return false;
    applyChanges(result.value);
    return true;
  };
  const deleteEntity = (name: string) => {
    const result = deleteEntityOperation(domainState(), name);
    if (result.ok) applyChanges(result.value);
  };
  const addAttribute = (tableName: string): string | null => {
    const result = addAttributeOperation(domainState(), tableName);
    if (!result.ok) return null;
    applyChanges(result.value);
    return result.value.attributeName;
  };
  const editAttribute = (tableName: string, oldName: string, changes: Partial<Column>): boolean => {
    const result = editAttributeOperation(domainState(), tableName, oldName, changes);
    if (!result.ok) return false;
    applyChanges(result.value);
    return true;
  };
  const deleteAttribute = (tableName: string, name: string): boolean => {
    const result = deleteAttributeOperation(domainState(), tableName, name);
    if (!result.ok) return false;
    applyChanges(result.value);
    return true;
  };
  const deleteRelation = (id: string) => {
    const result = deleteRelationOperation(domainState(), model.relations, id);
    if (result.ok) applyChanges(result.value);
  };
  return (
    <main className="app app-shell">
      <header className="topbar">
        <div className="brand-mark">P</div>
        <div>
          <p className="eyebrow">DATABASE EMULATOR</p>
          <h1>Diseña tu modelo de datos</h1>
        </div>
        <div className="history-controls">
          <button
            type="button"
            onClick={appState.undo}
            disabled={!appState.canUndo}
            aria-label="Deshacer"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={appState.redo}
            disabled={!appState.canRedo}
            aria-label="Rehacer"
          >
            Rehacer
          </button>
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
              hierarchies={hierarchies}
              setHierarchies={setHierarchies}
              positions={positions}
              setPositions={setPositions}
              view={view}
              setView={setView}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
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

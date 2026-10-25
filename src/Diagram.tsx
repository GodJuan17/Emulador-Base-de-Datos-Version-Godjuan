import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type {
  AttributeMark,
  DiagramModel,
  Entity,
  Hierarchy,
  Relation,
  RelationDraft,
} from "./model";
import { sameName } from "./domain/names";
import type { Column, WeakCardinality } from "./parser/ddlParser";
import type { CanvasPositions, CanvasView } from "./state/appState";
import { point, attributePosition, attributePoint } from "./features/conceptual-diagram/geometry";
import { orthogonalAttributeRoute } from "./features/conceptual-diagram/attributeRouting";
import { calculateLayout } from "./features/conceptual-diagram/layout";
import { exportSvgAsPdf } from "./features/export-pdf/exportSvgAsPdf";
import {
  ConceptualEntityNode,
  HierarchyNode,
  RelationshipNode,
} from "./features/conceptual-diagram/components";
import { HierarchyCreateDialog } from "./features/conceptual-diagram/modals/HierarchyCreateDialog";
import { RelationCreateDialog } from "./features/conceptual-diagram/modals/RelationCreateDialog";
import { EntityEditDialog } from "./features/conceptual-diagram/modals/EntityEditDialog";
import { AttributeEditDialog } from "./features/conceptual-diagram/modals/AttributeEditDialog";
import { RelationEditDialog } from "./features/conceptual-diagram/modals/RelationEditDialog";
import { HierarchyEditDialog } from "./features/conceptual-diagram/modals/HierarchyEditDialog";
import { useDiagramPointerHandlers } from "./features/conceptual-diagram/useDiagramPointerHandlers";
export type DiagramProps = {
  model: DiagramModel;
  conceptual: boolean;
  exerciseStatement: string;
  cardinalityMinimums: Record<string, (0 | 1)[]>;
  setCardinalityMinimums: (
    update: (current: Record<string, (0 | 1)[]>) => Record<string, (0 | 1)[]>,
  ) => void;
  names: Record<string, string>;
  rename: (id: string, value: string) => void;
  editRelation: (
    id: string,
    changes: { kind?: Relation["kind"]; mandatory?: boolean; weakCardinality?: WeakCardinality },
  ) => boolean;
  updateRelationRoles: (id: string, roles: [string, string]) => void;
  attributeMarks: Record<string, AttributeMark>;
  setAttributeMarks: (marks: Record<string, AttributeMark>) => void;
  domains: Record<string, string>;
  setDomains: (domains: Record<string, string>) => void;
  createRelation: (draft: RelationDraft) => boolean;
  hierarchyRequest: number;
  arrangeRequest: number;
  renameEntity: (oldName: string, newName: string) => boolean;
  requestEntityEdit: (name: string, attribute?: string) => void;
  entityRenameRequest?: { oldName: string; newName: string; token: number } | null;
  hierarchies: Hierarchy[];
  setHierarchies: Dispatch<SetStateAction<Hierarchy[]>>;
  positions: CanvasPositions;
  setPositions: Dispatch<SetStateAction<CanvasPositions>>;
  view: CanvasView;
  setView: Dispatch<SetStateAction<CanvasView>>;
  collapsed: Record<string, boolean>;
  setCollapsed: Dispatch<SetStateAction<Record<string, boolean>>>;
  deleteEntity: (name: string) => void;
  addAttribute: (table: string) => string | null;
  editAttribute: (table: string, oldName: string, changes: Partial<Column>) => boolean;
  deleteAttribute: (table: string, name: string) => boolean;
  deleteRelation: (id: string) => void;
};
function getEntity(name: string, entities: Entity[]): Entity | undefined {
  return entities.find((e) => sameName(e.table.name, name));
}
export function Diagram({
  model,
  conceptual,
  exerciseStatement,
  cardinalityMinimums,
  setCardinalityMinimums,
  names,
  rename,
  editRelation,
  updateRelationRoles,
  attributeMarks,
  setAttributeMarks,
  domains,
  setDomains,
  createRelation,
  hierarchyRequest,
  arrangeRequest,
  renameEntity,
  requestEntityEdit,
  entityRenameRequest,
  hierarchies,
  setHierarchies,
  positions,
  setPositions,
  view,
  setView,
  collapsed,
  setCollapsed,
  deleteEntity,
  addAttribute,
  editAttribute,
  deleteAttribute,
  deleteRelation,
}: DiagramProps) {
  const diagramProps: DiagramProps = {
    model,
    conceptual,
    exerciseStatement,
    cardinalityMinimums,
    setCardinalityMinimums,
    names,
    rename,
    editRelation,
    updateRelationRoles,
    attributeMarks,
    setAttributeMarks,
    domains,
    setDomains,
    createRelation,
    hierarchyRequest,
    arrangeRequest,
    renameEntity,
    requestEntityEdit,
    entityRenameRequest,
    hierarchies,
    setHierarchies,
    positions,
    setPositions,
    view,
    setView,
    collapsed,
    setCollapsed,
    deleteEntity,
    addAttribute,
    editAttribute,
    deleteAttribute,
    deleteRelation,
  };

  const [drag, setDrag] = useState<{ name: string; dx: number; dy: number } | null>(null);
  const [pan, setPan] = useState<{ clientX: number; clientY: number; x: number; y: number } | null>(
    null,
  );
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [entityNameDraft, setEntityNameDraft] = useState("");
  const [selectedAttribute, setSelectedAttribute] = useState<{
    entity: string;
    attribute: string;
  } | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<string | null>(null);
  const [selectedHierarchy, setSelectedHierarchy] = useState<string | null>(null);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const [hierarchyDraft, setHierarchyDraft] = useState({
    supertype: "",
    subtypes: [] as string[],
    exclusive: false,
    total: false,
  });
  const [relationTool, setRelationTool] = useState(false);
  const [relationStart, setRelationStart] = useState<string | null>(null);
  const [relationPointer, setRelationPointer] = useState({ x: 0, y: 0 });
  const [relationDraft, setRelationDraft] = useState<RelationDraft | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastHierarchyRequest = useRef(0);
  const lastArrangeRequest = useRef(arrangeRequest);
  const lastEntityCount = useRef(model.entities.length);
  const entities = useMemo(
    () => model.entities.map((e) => ({ ...e, ...(positions[e.table.name] ?? {}) })),
    [model.entities, positions],
  );
  useEffect(() => {
    if (!entityRenameRequest) return;
    const { oldName, newName } = entityRenameRequest;
    setPositions((current) => {
      const next = { ...current };
      if (next[oldName]) next[newName] = next[oldName];
      delete next[oldName];
      return next;
    });
    setHierarchies((current) =>
      current.map((item) => ({
        ...item,
        supertype: item.supertype === oldName ? newName : item.supertype,
        subtypes: item.subtypes.map((name) => (name === oldName ? newName : name)),
      })),
    );
  }, [entityRenameRequest?.token]);
  useEffect(() => {
    const previousCount = lastEntityCount.current;
    lastEntityCount.current = model.entities.length;
    if (previousCount === 0 && model.entities.length > 0) {
      const first = model.entities[0];
      setPositions((current) => ({
        ...current,
        [first.table.name]: { x: view.x + view.width / 2, y: view.y + view.height / 2 },
      }));
    }
  }, [model.entities, setPositions, view]);
  useEffect(() => {
    if (arrangeRequest <= lastArrangeRequest.current) return;
    lastArrangeRequest.current = arrangeRequest;
    const layout = calculateLayout(
      entities.filter((entity) => !entity.associative),
      model.relations,
      hierarchies,
    );
    setPositions((current) => ({ ...current, ...layout.positions }));
    setView(layout.view);
  }, [arrangeRequest]);
  useEffect(() => {
    if (hierarchyRequest > lastHierarchyRequest.current) {
      lastHierarchyRequest.current = hierarchyRequest;
      setHierarchyDraft({
        supertype: model.entities.find((entity) => !entity.associative)?.table.name ?? "",
        subtypes: [],
        exclusive: false,
        total: false,
      });
      setHierarchyOpen(true);
    }
  }, [hierarchyRequest]);
  const selectedEntityModel = selectedEntity
    ? entities.find((entity) => entity.table.name === selectedEntity)
    : undefined;
  const selectedAttributeKey = selectedAttribute
    ? [selectedAttribute.entity, selectedAttribute.attribute].join(".")
    : "";
  const selectedMark = selectedAttributeKey ? attributeMarks[selectedAttributeKey] : undefined;
  const selectedColumn = selectedAttribute
    ? entities
        .find((entity) => entity.table.name === selectedAttribute.entity)
        ?.table.columns.find((column) => column.name === selectedAttribute.attribute)
    : undefined;
  const selectedRelationModel = model.relations.find(
    (relation) => relation.id === selectedRelation,
  );
  const selectedHierarchyModel = hierarchies.find(
    (hierarchy) => hierarchy.id === selectedHierarchy,
  );
  const relationMinimum = (relation: Relation, index: number): 0 | 1 =>
    relation.weakCardinality
      ? index === 0
        ? 1
        : (Number(relation.weakCardinality[0]) as 0 | 1)
      : (cardinalityMinimums[relation.id]?.[index] ??
        (relation.foreignKeyNullable && index === 1 ? 0 : 1));
  const relationMaximum = (relation: Relation, index: number): "1" | "n" =>
    relation.participantMaximums?.[index] ??
    (relation.weakCardinality
      ? index === 0
        ? "1"
        : relation.weakCardinality.endsWith(":1")
          ? "1"
          : "n"
      : relation.kind === "1:1"
        ? "1"
        : relation.kind === "1:N"
          ? index === 0
            ? "1"
            : "n"
          : "n");
  const updateRecursiveRole = (index: 0 | 1, value: string) => {
    if (!selectedRelationModel?.roles) return;
    const roles: [string, string] = [...selectedRelationModel.roles];
    roles[index] = value;
    updateRelationRoles(selectedRelationModel.id, roles);
  };
  const attributeAvoidAngles = (entity: Entity) => {
    const angles: number[] = [];
    const addTarget = (target: { x: number; y: number }) =>
      angles.push(Math.atan2(target.y - entity.y, target.x - entity.x));
    for (const relation of model.relations) {
      const participants = relation.participants ?? [relation.left, relation.right];
      if (!participants.some((name) => sameName(name, entity.table.name))) continue;
      const others = participants
        .filter((name) => !sameName(name, entity.table.name))
        .map((name) => getEntity(name, entities))
        .filter((item): item is Entity => Boolean(item));
      if (!others.length) addTarget({ x: entity.x + 145, y: entity.y - 85 });
      else
        addTarget({
          x: others.reduce((sum, item) => sum + item.x, 0) / others.length,
          y: others.reduce((sum, item) => sum + item.y, 0) / others.length,
        });
    }
    for (const hierarchy of hierarchies) {
      const names = [hierarchy.supertype, ...hierarchy.subtypes];
      if (!names.some((name) => sameName(name, entity.table.name))) continue;
      const others = names
        .filter((name) => !sameName(name, entity.table.name))
        .map((name) => getEntity(name, entities))
        .filter((item): item is Entity => Boolean(item));
      if (others.length)
        addTarget({
          x: others.reduce((sum, item) => sum + item.x, 0) / others.length,
          y: others.reduce((sum, item) => sum + item.y, 0) / others.length,
        });
    }
    return angles;
  };
  const updateRelationMinimum = (id: string, count: number, index: number, value: 0 | 1) => {
    setCardinalityMinimums((current) => ({
      ...current,
      [id]: Array.from({ length: count }, (_, i) =>
        i === index ? value : (current[id]?.[i] ?? 1),
      ),
    }));
    if (index === 1 && selectedRelationModel?.kind !== "N:M")
      editRelation(id, { mandatory: value === 1 });
  };
  const { move, start, finishRelation, startPan, endPointer, wheelZoom } =
    useDiagramPointerHandlers({
      conceptual,
      relationTool,
      relationStart,
      setRelationStart,
      relationPointer,
      setRelationPointer,
      drag,
      setDrag,
      pan,
      setPan,
      view,
      setView,
      setPositions,
      setRelationDraft,
    });
  const availableEntities = entities
    .filter((entity) => !entity.associative)
    .map((entity) => entity.table.name);
  const saveHierarchy = () => {
    const subtypes = hierarchyDraft.subtypes.filter(Boolean);
    if (availableEntities.length < 3 || !hierarchyDraft.supertype || subtypes.length < 2) return;
    setHierarchies((current) => [
      ...current,
      { id: "hierarchy-" + Date.now(), ...hierarchyDraft, subtypes },
    ]);
    setHierarchyOpen(false);
    setHierarchyDraft({ supertype: "", subtypes: [], exclusive: false, total: false });
  };
  const saveRelation = () => {
    if (!relationDraft) return;
    createRelation(relationDraft);
    setRelationDraft(null);
    setRelationTool(false);
  };
  const exportPdf = async () => {
    if (!svgRef.current) return;
    try {
      await exportSvgAsPdf(
        svgRef.current,
        conceptual ? "modelo-conceptual.pdf" : "modelo-logico.pdf",
        exerciseStatement,
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo exportar el PDF.");
    }
  };
  const setAttributeKind = (kind: AttributeMark["kind"] | "simple") => {
    if (!selectedAttribute) return;
    const key = [selectedAttribute.entity, selectedAttribute.attribute].join(".");
    if (kind === "simple") {
      const next = { ...attributeMarks };
      delete next[key];
      setAttributeMarks(next);
      return;
    }
    setAttributeMarks({
      ...attributeMarks,
      [key]: { kind, parts: attributeMarks[key]?.parts ?? [] },
    });
  };
  const updateAttributeParts = (value: string) => {
    if (!selectedAttribute) return;
    const key = [selectedAttribute.entity, selectedAttribute.attribute].join(".");
    const currentKind = attributeMarks[key]?.kind;
    const kind = currentKind === "multivalued-composite" ? currentKind : "composite";
    setAttributeMarks({
      ...attributeMarks,
      [key]: {
        kind,
        parts: value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      },
    });
  };
  const commitEntityName = () => {
    if (!selectedEntity || !renameEntity(selectedEntity, entityNameDraft)) return;
    const next = entityNameDraft.trim();
    setPositions((current) => {
      const positions = { ...current };
      if (positions[selectedEntity]) positions[next] = positions[selectedEntity];
      delete positions[selectedEntity];
      return positions;
    });
    setHierarchies((current) =>
      current.map((item) => ({
        ...item,
        supertype: item.supertype === selectedEntity ? next : item.supertype,
        subtypes: item.subtypes.map((name) => (name === selectedEntity ? next : name)),
      })),
    );
    setSelectedEntity(next);
  };
  return (
    <section className="diagram-card">
      <HierarchyCreateDialog
        hierarchyOpen={hierarchyOpen}
        setHierarchyOpen={setHierarchyOpen}
        hierarchyDraft={hierarchyDraft}
        setHierarchyDraft={setHierarchyDraft}
        availableEntities={availableEntities}
        saveHierarchy={saveHierarchy}
      />
      <EntityEditDialog
        selectedEntity={selectedEntity}
        selectedEntityModel={selectedEntityModel}
        entityNameDraft={entityNameDraft}
        setEntityNameDraft={setEntityNameDraft}
        setSelectedEntity={setSelectedEntity}
        commitEntityName={commitEntityName}
        addAttribute={addAttribute}
        setSelectedAttribute={setSelectedAttribute}
        deleteEntity={deleteEntity}
        setHierarchies={setHierarchies}
      />
      <AttributeEditDialog
        selectedAttribute={selectedAttribute}
        selectedColumn={selectedColumn}
        selectedMark={selectedMark}
        selectedAttributeKey={selectedAttributeKey}
        domains={domains}
        setDomains={setDomains}
        setSelectedAttribute={setSelectedAttribute}
        editAttribute={editAttribute}
        setAttributeKind={setAttributeKind}
        updateAttributeParts={updateAttributeParts}
        deleteAttribute={deleteAttribute}
      />
      <RelationEditDialog
        diagram={diagramProps}
        selectedRelation={selectedRelation}
        selectedRelationModel={selectedRelationModel}
        setSelectedRelation={setSelectedRelation}
        setSelectedAttribute={setSelectedAttribute}
        setSelectedEntity={setSelectedEntity}
        setSelectedHierarchy={setSelectedHierarchy}
        relationMinimum={relationMinimum}
        updateRecursiveRole={updateRecursiveRole}
        updateRelationMinimum={updateRelationMinimum}
      />
      <HierarchyEditDialog
        diagram={diagramProps}
        selectedHierarchy={selectedHierarchy}
        selectedHierarchyModel={selectedHierarchyModel}
        availableEntities={availableEntities}
        setSelectedHierarchy={setSelectedHierarchy}
      />
      <RelationCreateDialog
        relationDraft={relationDraft}
        setRelationDraft={setRelationDraft}
        saveRelation={saveRelation}
      />
      <div className="diagram-export-bar">
        <button type="button" onClick={() => void exportPdf()}>
          Descargar PDF
        </button>
      </div>
      <svg
        ref={svgRef}
        className={relationTool ? "diagram-svg relationship-mode" : "diagram-svg"}
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        role="img"
        aria-label={conceptual ? "Modelo conceptual entidad relación" : "Modelo lógico de tablas"}
        onPointerDown={startPan}
        onPointerMove={move}
        onPointerUp={endPointer}
        onPointerLeave={endPointer}
        onWheel={wheelZoom}
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0L8 4L0 8z" fill="#7e929d" />
          </marker>
          <marker
            id="multi-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto-start-reverse"
          >
            <path d="M0 0L8 4L0 8z" fill="#7e929d" />
          </marker>
        </defs>
        {conceptual &&
          entities.flatMap((child) =>
            child.table.foreignKeys
              .filter((fk) => fk.dependency === "ID")
              .flatMap((fk) => {
                const parent = getEntity(fk.table, entities);
                if (!parent) return [];
                return fk.columns.map((childKey, index) => {
                  const parentKey = fk.targetColumns?.[index] ?? parent.table.primaryKey[index];
                  const from = attributePoint(
                    parent,
                    parentKey,
                    Boolean(collapsed[parent.table.name]),
                    attributeAvoidAngles(parent),
                  );
                  const to = attributePoint(
                    child,
                    childKey,
                    Boolean(collapsed[child.table.name]),
                    attributeAvoidAngles(child),
                  );
                  return from && to ? (
                    <path
                      key={`identifying:${parent.table.name}:${child.table.name}:${index}`}
                      d={orthogonalAttributeRoute(
                        { x: from.x, y: from.y + 7 },
                        { x: to.x, y: to.y + 7 },
                        entities,
                      )}
                      className="identifying-attribute-edge"
                    />
                  ) : null;
                });
              }),
          )}
        {relationStart &&
          (() => {
            const origin = getEntity(relationStart, entities);
            return origin ? (
              <line
                x1={origin.x}
                y1={origin.y}
                x2={relationPointer.x}
                y2={relationPointer.y}
                className="relation-preview"
              />
            ) : null;
          })()}
        {conceptual ? (
          <>
            {hierarchies.map((hierarchy) => (
              <HierarchyNode
                key={hierarchy.id}
                hierarchy={hierarchy}
                entities={entities}
                onEdit={(id) => {
                  setSelectedHierarchy(id);
                  setSelectedEntity(null);
                  setSelectedAttribute(null);
                  setSelectedRelation(null);
                }}
              />
            ))}
            {model.relations.map((relation) => (
              <RelationshipNode
                key={relation.id}
                relation={relation}
                entities={entities}
                names={names}
                relationMinimum={relationMinimum}
                relationMaximum={relationMaximum}
                onEditRelation={(id) => {
                  setSelectedRelation(id);
                  setSelectedAttribute(null);
                  setSelectedEntity(null);
                  setSelectedHierarchy(null);
                }}
                onEditAttribute={(entity, attribute) => {
                  setSelectedAttribute({ entity, attribute });
                  setSelectedEntity(null);
                  setSelectedRelation(null);
                  setSelectedHierarchy(null);
                }}
              />
            ))}
            {entities
              .filter((entity) => !entity.associative)
              .map((entity) => (
                <ConceptualEntityNode
                  key={entity.table.name}
                  entity={entity}
                  collapsed={Boolean(collapsed[entity.table.name])}
                  attributeMarks={attributeMarks}
                  domains={domains}
                  selectedAttributeKey={selectedAttributeKey}
                  onStart={start}
                  onFinishRelation={finishRelation}
                  onEditEntity={(name) => {
                    setSelectedEntity(null);
                    setSelectedAttribute(null);
                    setSelectedRelation(null);
                    setSelectedHierarchy(null);
                    requestEntityEdit(name);
                  }}
                  onEditAttribute={(name, attribute) => {
                    setSelectedEntity(null);
                    setSelectedRelation(null);
                    setSelectedHierarchy(null);
                    requestEntityEdit(name, attribute);
                  }}
                  onToggleCollapsed={(name) =>
                    setCollapsed((current) => ({ ...current, [name]: !current[name] }))
                  }
                  positionAttribute={(item, index, count) =>
                    attributePosition(item, index, count, attributeAvoidAngles(item))
                  }
                />
              ))}
          </>
        ) : (
          <>
            {hierarchies.flatMap((hierarchy) =>
              hierarchy.subtypes.map((subtypeName) => {
                const parent = getEntity(hierarchy.supertype, entities);
                const child = getEntity(subtypeName, entities);
                if (!parent || !child) return null;
                const dx = child.x - parent.x;
                const dy = child.y - parent.y;
                const length = Math.max(1, Math.hypot(dx, dy));
                const sx = parent.x + (dx / length) * 108;
                const sy = parent.y + (dy / length) * 24;
                const ex = child.x - (dx / length) * 108;
                const ey = child.y - (dy / length) * 24;
                return (
                  <g key={`${hierarchy.id}:${subtypeName}`} className="hierarchy">
                    <title>
                      Implementación relacional: la clave primaria del subtipo también es clave
                      foránea del supertipo (relación 1:1).
                    </title>
                    <line
                      x1={sx}
                      y1={sy}
                      x2={ex}
                      y2={ey}
                      className="logic-edge"
                      markerEnd="url(#arrow)"
                    />
                    <text
                      x={(sx + ex) / 2}
                      y={(sy + ey) / 2 - 8}
                      textAnchor="middle"
                      className="logic-cardinality"
                    >
                      1 : 1 · hereda
                    </text>
                  </g>
                );
              }),
            )}
            {model.logicalRelations.map((r) => {
              const a = point(getEntity(r.left, entities), 0);
              const b = point(getEntity(r.right, entities), 1);
              const self = sameName(r.left, r.right);
              const hierarchyLink = hierarchies.some(
                (h) =>
                  sameName(h.supertype, r.left) && h.subtypes.some((s) => sameName(s, r.right)),
              );
              if (hierarchyLink) return null;
              if (self)
                return (
                  <g key={r.id} className="recursive-relation">
                    <path
                      d={
                        "M" +
                        (a.x + 45) +
                        " " +
                        (a.y - 28) +
                        " C" +
                        (a.x + 150) +
                        " " +
                        (a.y - 125) +
                        " " +
                        (a.x - 150) +
                        " " +
                        (a.y - 125) +
                        " " +
                        (a.x - 45) +
                        " " +
                        (a.y - 28)
                      }
                      className="logic-edge recursive-self-edge"
                      markerEnd="url(#arrow)"
                    />
                    <text x={a.x} y={a.y - 82} textAnchor="middle" className="logic-cardinality">
                      1 : *
                    </text>
                  </g>
                );
              return (
                <g key={r.id}>
                  <line
                    x1={a.x + 104}
                    y1={a.y}
                    x2={b.x - 104}
                    y2={b.y}
                    className="logic-edge"
                    markerEnd="url(#arrow)"
                  />
                  <text x={a.x + 107} y={a.y - 10} className="logic-cardinality">
                    1
                  </text>
                  <text x={b.x - 120} y={b.y - 10} className="logic-cardinality">
                    *
                  </text>
                </g>
              );
            })}
            {entities.map((e) => {
              const { table } = e;
              const inheritedFrom = hierarchies.find((h) =>
                h.subtypes.some((name) => sameName(name, table.name)),
              )?.supertype;
              const parentTable = inheritedFrom
                ? entities.find((entity) => sameName(entity.table.name, inheritedFrom))?.table
                : undefined;
              const parentForeignKey = inheritedFrom
                ? table.foreignKeys.find((fk) => sameName(fk.table, inheritedFrom))
                : undefined;
              const inheritedColumns = new Set(
                (parentForeignKey?.columns ?? []).map((name) => name.toLowerCase()),
              );
              const inheritedRows =
                inheritedFrom && parentTable
                  ? parentTable.primaryKey.map((parentKey, index) => {
                      const localName = parentForeignKey?.columns[index] ?? parentKey;
                      return {
                        key: `__hierarchy_${inheritedFrom}_${parentKey}`,
                        label: `PK/FK ${localName}${parentForeignKey ? "" : ` → ${inheritedFrom}`}`,
                      };
                    })
                  : [];
              const ownRows = table.columns
                .filter(
                  (column) =>
                    !inheritedColumns.has(column.name.toLowerCase()) &&
                    (!inheritedFrom || !column.primaryKey),
                )
                .map((column) => ({
                  key: column.name,
                  label: [
                    column.primaryKey ? "PK " : "",
                    column.name,
                    column.foreignKey ? " FK" : "",
                  ].join(""),
                }));
              const logicalRows = [...inheritedRows, ...ownRows];
              const h = 40 + logicalRows.length * 25;
              return (
                <g
                  key={table.name}
                  className="drag-node"
                  onPointerDown={(event) => start(event, e)}
                >
                  <rect
                    x={e.x - 105}
                    y={e.y - h / 2}
                    width="210"
                    height={h}
                    rx="6"
                    className="table-box"
                  />
                  <path
                    d={`M${e.x - 105} ${e.y - h / 2 + 39}H${e.x + 105}`}
                    className="table-divider"
                  />
                  <text x={e.x} y={e.y - h / 2 + 26} textAnchor="middle" className="table-title">
                    {table.name.toLocaleUpperCase("es")}
                  </text>
                  {logicalRows.map((row, i) => (
                    <text
                      key={row.key}
                      x={e.x - 92}
                      y={e.y - h / 2 + 59 + i * 25}
                      className="table-column"
                    >
                      {row.label}
                    </text>
                  ))}
                </g>
              );
            })}
          </>
        )}
      </svg>
      {conceptual && (
        <div className="mpm-legend">
          <strong>Simbología MPM1999</strong>
          <span>
            <b className="legend-ip" /> PK identificador principal
          </span>
          <span>
            <b className="legend-ak" /> AK clave alternativa
          </span>
          <span>
            <b className="legend-uk">UK</b> clave única
          </span>
          <span>
            <b className="legend-derived">D</b> atributo derivado
          </span>
          <span>
            <i className="legend-multi" /> atributo multivaluado
          </span>
          <span>
            <i className="legend-composite" /> atributo compuesto
          </span>
          <span>
            <i className="domain-oval legend-domain" /> dominio
          </span>
          <span>
            <b className="legend-relation">Ex / Id</b> dependencia existencial / identificativa
          </span>
          <small>
            Jerarquías: triángulo sin arco = solapada; con arco = exclusiva. Círculo en el tallo =
            total; sin círculo = parcial. El DDL no permite inferir dominios ni jerarquías: se
            añaden desde el diseñador.
          </small>
        </div>
      )}
    </section>
  );
}

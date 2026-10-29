import type { MouseEvent } from "react";
import { sameName } from "../../../domain/names";
import type { Entity, Hierarchy } from "../../../model";
import { hierarchyGeometry, type HierarchyBox } from "../hierarchyGeometry";

type Props = {
  hierarchy: Hierarchy;
  entities: Entity[];
  onEdit: (id: string) => void;
  onContextMenu: (event: MouseEvent<SVGGElement>, id: string) => void;
};

function getEntity(name: string, entities: Entity[]): Entity | undefined {
  return entities.find((entity) => sameName(entity.table.name, name));
}

function box(entity: Entity): HierarchyBox {
  return { x: entity.x, y: entity.y, halfWidth: 78, halfHeight: 28 };
}

function labelPoint(from: { x: number; y: number }, to: { x: number; y: number }, side: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const x = from.x + dx * 0.52 - (dy / length) * 13 * side;
  const y = from.y + dy * 0.52 + (dx / length) * 13 * side;
  return { x, y };
}

export function HierarchyNode({ hierarchy, entities, onEdit, onContextMenu }: Props) {
  const supertype = getEntity(hierarchy.supertype, entities);
  const children = hierarchy.subtypes
    .map((name) => getEntity(name, entities))
    .filter((entity): entity is Entity => Boolean(entity));
  if (!supertype || children.length < 2) return null;
  const geometry = hierarchyGeometry(box(supertype), children.map(box));
  if (!geometry) return null;
  const exclusiveLabel = hierarchy.exclusive ? "Exclusiva" : "Solapada";
  const totalLabel = hierarchy.total ? "total" : "parcial";
  const description = `${exclusiveLabel} y ${totalLabel}. Doble clic para ver opciones.`;
  const supertypeLabel = labelPoint(geometry.stem[0], geometry.connector, -1);
  return (
    <g
      key={hierarchy.id}
      className="hierarchy"
      role="group"
      aria-label={`Herencia ${supertype.table.name} → ${children
        .map((child) => child.table.name)
        .join(", ")}. ${description}`}
      onContextMenu={(event) => onContextMenu(event, hierarchy.id)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onEdit(hierarchy.id);
      }}
    >
      <title>{description}</title>
      {hierarchy.total ? (
        geometry.doubleStem.map(([from, to], index) => (
          <line
            key={`stem:${index}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className="hierarchy-edge hierarchy-total-stem"
          />
        ))
      ) : (
        <line
          x1={geometry.stem[0].x}
          y1={geometry.stem[0].y}
          x2={geometry.stem[1].x}
          y2={geometry.stem[1].y}
          className="hierarchy-edge"
        />
      )}
      <text
        x={supertypeLabel.x}
        y={supertypeLabel.y}
        textAnchor="middle"
        className="hierarchy-cardinality"
      >
        (1,1)
      </text>
      {geometry.childAnchors.map((anchor, index) => {
        const end = geometry.childLineEnds[index];
        const label = labelPoint(anchor, end, index % 2 === 0 ? -1 : 1);
        return (
          <g key={children[index].table.name}>
            <line x1={anchor.x} y1={anchor.y} x2={end.x} y2={end.y} className="hierarchy-edge" />
            <text x={label.x} y={label.y} textAnchor="middle" className="hierarchy-cardinality">
              (0,1)
            </text>
          </g>
        );
      })}
      {hierarchy.exclusive && <path d={geometry.arc} className="hierarchy-arc" />}
      <circle
        cx={geometry.connector.x}
        cy={geometry.connector.y}
        r={geometry.radius + 8}
        className="hierarchy-hit"
      />
      <circle
        cx={geometry.connector.x}
        cy={geometry.connector.y}
        r={geometry.radius}
        className={hierarchy.total ? "hierarchy-circle total" : "hierarchy-circle"}
      />
      <text
        x={geometry.connector.x}
        y={geometry.connector.y + 3.4}
        textAnchor="middle"
        className={hierarchy.total ? "hierarchy-symbol total" : "hierarchy-symbol"}
      >
        {hierarchy.exclusive ? "d" : "o"}
      </text>
    </g>
  );
}

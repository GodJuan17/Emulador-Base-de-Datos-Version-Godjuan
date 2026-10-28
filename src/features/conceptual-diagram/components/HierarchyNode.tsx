import type { MouseEvent } from "react";
import { sameName } from "../../../domain/names";
import type { Entity, Hierarchy } from "../../../model";

type Props = {
  hierarchy: Hierarchy;
  entities: Entity[];
  onEdit: (id: string) => void;
  onContextMenu: (event: MouseEvent<SVGGElement>, id: string) => void;
};

function getEntity(name: string, entities: Entity[]): Entity | undefined {
  return entities.find((entity) => sameName(entity.table.name, name));
}

export function HierarchyNode({ hierarchy, entities, onEdit, onContextMenu }: Props) {
  const supertype = getEntity(hierarchy.supertype, entities);
  const children = hierarchy.subtypes
    .map((name) => getEntity(name, entities))
    .filter((entity): entity is Entity => Boolean(entity));
  if (!supertype || children.length < 2) return null;
  const centerX = children.reduce((sum, entity) => sum + entity.x, 0) / children.length;
  const childY = children.reduce((sum, entity) => sum + entity.y, 0) / children.length;
  const centerY = (supertype.y + childY) / 2;
  const apexY = centerY - 22;
  const baseY = centerY + 18;
  const arcReach = Math.max(90, ...children.map((child) => Math.abs(child.x - centerX) + 24));
  const arcPath = [
    `M${centerX - arcReach} ${baseY + 10}`,
    `Q${centerX} ${baseY + 88}`,
    `${centerX + arcReach} ${baseY + 10}`,
  ].join(" ");
  const exclusiveLabel = hierarchy.exclusive ? "Exclusiva" : "Solapada";
  const totalLabel = hierarchy.total ? "total" : "parcial";
  const description = `${exclusiveLabel} y ${totalLabel}. Doble clic para ver opciones.`;
  return (
    <g
      key={hierarchy.id}
      className="hierarchy"
      onContextMenu={(event) => onContextMenu(event, hierarchy.id)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onEdit(hierarchy.id);
      }}
    >
      <title>{description}</title>
      <line
        x1={supertype.x}
        y1={supertype.y + 29}
        x2={centerX}
        y2={apexY}
        className="hierarchy-edge"
      />
      <text
        x={supertype.x + 12}
        y={supertype.y + 43}
        textAnchor="start"
        className="hierarchy-cardinality"
      >
        (1,1)
      </text>
      {children.map((child, index) => {
        const baseX = centerX + (index - (children.length - 1) / 2) * 38;
        return (
          <g key={child.table.name}>
            <line x1={baseX} y1={apexY} x2={child.x} y2={child.y - 30} className="hierarchy-edge" />
            <text
              x={child.x + (child.x < centerX ? -42 : 42)}
              y={child.y - 39}
              textAnchor="middle"
              className="hierarchy-cardinality"
            >
              (0,1)
            </text>
          </g>
        );
      })}
      <polygon
        points={`${centerX - 34},${apexY} ${centerX + 34},${apexY} ${centerX},${baseY}`}
        className="hierarchy-triangle"
      />
      {hierarchy.exclusive && <path d={arcPath} className="hierarchy-arc" />}
      {hierarchy.total && <circle cx={centerX} cy={apexY - 9} r="5" className="hierarchy-total" />}
    </g>
  );
}

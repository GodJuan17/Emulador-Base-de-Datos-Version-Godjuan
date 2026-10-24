import type { PointerEvent } from "react";
import type { AttributeMark, Entity } from "../../../model";

type Props = {
  entity: Entity;
  collapsed: boolean;
  attributeMarks: Record<string, AttributeMark>;
  domains: Record<string, string>;
  selectedAttributeKey: string;
  onStart: (event: PointerEvent<SVGGElement>, entity: Entity) => void;
  onFinishRelation: (event: PointerEvent<SVGGElement>, entity: Entity) => void;
  onEditEntity: (name: string) => void;
  onEditAttribute: (entity: string, attribute: string) => void;
  onToggleCollapsed: (name: string) => void;
  positionAttribute: (
    entity: Entity,
    index: number,
    count: number,
  ) => { x: number; y: number; angle: number };
};

export function ConceptualEntityNode({
  entity,
  collapsed,
  attributeMarks,
  domains,
  selectedAttributeKey,
  onStart,
  onFinishRelation,
  onEditEntity,
  onEditAttribute,
  onToggleCollapsed,
  positionAttribute,
}: Props) {
  const attributes = entity.table.columns.filter(
    (column) => column.primaryKey || !column.foreignKey,
  );
  const shownAttributes = collapsed ? attributes.slice(0, 1) : attributes;

  return (
    <g
      className="drag-node"
      onPointerDown={(event) => onStart(event, entity)}
      onPointerUp={(event) => onFinishRelation(event, entity)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onEditEntity(entity.table.name);
      }}
    >
      <rect x={entity.x - 78} y={entity.y - 28} width="156" height="56" rx="5" className="entity" />
      <path d={`M${entity.x + 78} ${entity.y - 28}v56h-156`} className="entity-emphasis" />
      {entity.weak && (
        <rect
          x={entity.x - 73}
          y={entity.y - 23}
          width="146"
          height="46"
          rx="3"
          className="weak-entity-inner"
        />
      )}
      <text
        x={entity.x}
        y={entity.y + 2}
        textAnchor="middle"
        dominantBaseline="central"
        alignmentBaseline="central"
        className="entity-name"
      >
        {entity.table.name.toLocaleUpperCase("es")}
      </text>
      {shownAttributes.map((column, index) => {
        const { x, y, angle } = positionAttribute(entity, index, shownAttributes.length);
        const key = `${entity.table.name}.${column.name}`;
        const mark = attributeMarks[key];
        const composite = mark?.kind === "composite" || mark?.kind === "multivalued-composite";
        const labelX = composite ? x : x + Math.cos(angle) * 18;
        const labelY = composite ? y - 14 : y + Math.sin(angle) * 18;
        const labelAnchor = composite
          ? "middle"
          : Math.cos(angle) > 0.35
            ? "start"
            : Math.cos(angle) < -0.35
              ? "end"
              : "middle";
        const domain = domains[key];
        const stemX = entity.x + Math.cos(angle) * 79;
        const stemY = entity.y + Math.sin(angle) * 29;
        const edgeClass =
          mark?.kind === "optional" || column.nullable ? "edge optional-attribute" : "edge";

        return (
          <g
            key={column.name}
            className={selectedAttributeKey === key ? "selected-attribute" : ""}
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onEditAttribute(entity.table.name, column.name);
            }}
          >
            <line
              x1={stemX}
              y1={stemY}
              x2={x}
              y2={y}
              className={edgeClass}
              markerEnd={
                mark?.kind === "multivalued" || mark?.kind === "multivalued-composite"
                  ? "url(#multi-arrow)"
                  : undefined
              }
            />
            <circle
              cx={x}
              cy={y}
              r="4"
              className={column.primaryKey ? "key-attribute" : "attribute"}
            />
            {column.alternateKey && (
              <>
                <path
                  d={`M${x} ${y - 4} A4 4 0 0 0 ${x} ${y + 4} Z`}
                  className="alternate-key-half"
                />
                <circle cx={x} cy={y} r="4" className="alternate-key-outline" />
              </>
            )}
            <text x={labelX} y={labelY + 3} textAnchor={labelAnchor} className="attribute-label">
              {column.name.slice(0, 18)}
            </text>
            {domain && (
              <g className="domain">
                <ellipse
                  cx={(x + stemX) / 2}
                  cy={(y + stemY) / 2}
                  rx={Math.max(25, domain.length * 3.8)}
                  ry="13"
                  className="domain-oval"
                />
                <text
                  x={(x + stemX) / 2}
                  y={(y + stemY) / 2 + 3}
                  textAnchor="middle"
                  className="domain-label"
                >
                  {domain}
                </text>
              </g>
            )}
            {composite &&
              mark.parts.map((part, childIndex) => {
                const childX = x + (childIndex - (mark.parts.length - 1) / 2) * 32;
                const childY = y + 63;
                return (
                  <g key={`${part}-${childIndex}`}>
                    <line x1={x} y1={y + 6} x2={childX} y2={childY - 12} className="edge" />
                    <circle cx={childX} cy={childY} r="10" className="attribute" />
                    <text
                      x={childX}
                      y={childY - 19}
                      textAnchor="middle"
                      className="component-label"
                    >
                      {part.slice(0, 8)}
                    </text>
                  </g>
                );
              })}
          </g>
        );
      })}
      {attributes.length > 1 && (
        <text
          x={entity.x + 76}
          y={entity.y - 34}
          className="collapse"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onToggleCollapsed(entity.table.name)}
        >
          {collapsed ? "+" : "−"}
        </text>
      )}
    </g>
  );
}

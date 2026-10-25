import { sameName } from "../../../domain/names";
import type { Entity, Relation } from "../../../model";
import { point, entityEdge, diamondEdge, cardinalityPoint } from "../geometry";

function getEntity(name: string, entities: Entity[]): Entity | undefined {
  return entities.find((entity) => sameName(entity.table.name, name));
}

type Props = {
  relation: Relation;
  entities: Entity[];
  names: Record<string, string>;
  relationMinimum: (relation: Relation, index: number) => 0 | 1;
  relationMaximum: (relation: Relation, index: number) => "1" | "n";
  onEditRelation: (id: string) => void;
  onEditAttribute: (entity: string, attribute: string) => void;
};

type RelationAttributeProps = {
  attributes: string[];
  relationName: string;
  centerX: number;
  centerY: number;
  diamondRadius: number;
  onEditAttribute: (entity: string, attribute: string) => void;
};

function RelationAttributeNodes({
  attributes,
  relationName,
  centerX,
  centerY,
  diamondRadius,
  onEditAttribute,
}: RelationAttributeProps) {
  const widths = attributes.map((attribute) => Math.max(54, attribute.length * 6 + 18));
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  let offset = -totalWidth / 2;
  const y = centerY + diamondRadius + 40;

  return (
    <g className="relation-attributes">
      {attributes.map((attribute, index) => {
        const x = centerX + offset + 5;
        offset += widths[index];
        return (
          <g
            key={attribute}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onEditAttribute(relationName, attribute);
            }}
          >
            <line x1={centerX} y1={centerY + diamondRadius} x2={x} y2={y} className="edge" />
            <circle cx={x} cy={y} r="4" className="attribute" />
            <text x={x + 9} y={y + 3} textAnchor="start" className="attribute-label">
              {attribute.slice(0, 18)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function RelationshipNode({
  relation: r,
  entities,
  names,
  relationMinimum,
  relationMaximum,
  onEditRelation,
  onEditAttribute,
}: Props) {
  const participants = r.participants ?? [r.left, r.right];
  if (participants.length >= 3) {
    const points = participants.map((name, index) => point(getEntity(name, entities), index));
    const mx = points.reduce((sum, p) => sum + p.x, 0) / points.length,
      my = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    let manyIndex = 0;
    const manyLabels = ["N", "M", "P", "Q"];
    const ratio = participants
      .map((_, index) => {
        const maximum = r.participantMaximums?.[index] ?? "n";
        return maximum === "1" ? "1" : (manyLabels[manyIndex++] ?? "N");
      })
      .join(":");
    const openRelationEditor = () => onEditRelation(r.id);
    return (
      <g key={r.id}>
        {points.map((p, index) => {
          const start = entityEdge(p, { x: mx, y: my });
          const end = diamondEdge({ x: mx, y: my }, p);
          const label = cardinalityPoint(start, end, 1);
          const lx = label.x,
            ly = label.y;
          return (
            <g key={`${r.id}:${participants[index]}`}>
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="edge" />
              <text x={lx} y={ly} textAnchor="middle" className="cardinality">
                ({relationMinimum(r, index)},{relationMaximum(r, index)})
              </text>
            </g>
          );
        })}
        <polygon
          points={`${mx},${my - 49} ${mx + 49},${my} ${mx},${my + 49} ${mx - 49},${my}`}
          className="diamond"
          onDoubleClick={(event) => {
            event.stopPropagation();
            openRelationEditor();
          }}
        />
        <text x={mx} y={my + 3} textAnchor="middle" className="relation-name">
          {(names[r.id] ?? r.name).slice(0, 15)}
        </text>
        <text x={mx} y={my - 47} textAnchor="middle" className="ratio">
          {ratio}
        </text>
        <RelationAttributeNodes
          attributes={r.attributes}
          relationName={r.name}
          centerX={mx}
          centerY={my}
          diamondRadius={49}
          onEditAttribute={onEditAttribute}
        />
      </g>
    );
  }
  const a = point(getEntity(r.left, entities), 0);
  const b = point(getEntity(r.right, entities), 1);
  const same = sameName(r.left, r.right);
  const mx = same ? a.x + 160 : (a.x + b.x) / 2;
  const my = same ? a.y : (a.y + b.y) / 2;
  const ratio = r.weakCardinality ? (r.weakCardinality.endsWith(":1") ? "1:1" : "1:N") : r.kind;
  const leftLabel = `(${relationMinimum(r, 0)},${relationMaximum(r, 0)})`;
  const rightLabel = `(${relationMinimum(r, 1)},${relationMaximum(r, 1)})`;
  const leftCardX = same ? (a.x + mx) / 2 : a.x + 104;
  const rightCardX = same ? (a.x + mx) / 2 : a.x + 104;
  const leftCardAnchor = same ? "middle" : "start";
  const rightCardAnchor = same ? "middle" : "start";
  const leftCardY = same ? a.y - 96 : a.y - 30;
  const rightCardY = same ? a.y - 9 : a.y + 34;
  const startPoint = same ? { x: a.x + 78, y: a.y } : entityEdge(a, { x: mx, y: my });
  const endPoint = same ? { x: a.x, y: a.y - 28 } : entityEdge(b, { x: mx, y: my });
  const leftDiamondPoint = same ? { x: mx - 44, y: my } : diamondEdge({ x: mx, y: my }, a);
  const rightDiamondPoint = same ? { x: mx, y: my - 44 } : diamondEdge({ x: mx, y: my }, b);
  const leftLabelPoint = same
    ? { x: leftCardX, y: leftCardY }
    : cardinalityPoint(startPoint, leftDiamondPoint, 1);
  const rightLabelPoint = same
    ? { x: rightCardX, y: rightCardY }
    : cardinalityPoint(endPoint, rightDiamondPoint, -1);
  const loopY = a.y - 88;
  const recursiveLoopPath = `M${endPoint.x} ${endPoint.y} V${loopY} H${mx} V${my - 44}`;
  return (
    <g key={r.id} className={same ? "recursive-relation" : undefined}>
      {same ? (
        <>
          <line
            x1={startPoint.x}
            y1={startPoint.y}
            x2={leftDiamondPoint.x}
            y2={leftDiamondPoint.y}
            className="edge recursive-self-edge"
          />
          <path d={recursiveLoopPath} className="recursive-self-edge" />
        </>
      ) : (
        <>
          <line
            x1={startPoint.x}
            y1={startPoint.y}
            x2={leftDiamondPoint.x}
            y2={leftDiamondPoint.y}
            className="edge"
          />
          <line
            x1={rightDiamondPoint.x}
            y1={rightDiamondPoint.y}
            x2={endPoint.x}
            y2={endPoint.y}
            className="edge"
          />
        </>
      )}
      <text
        x={leftLabelPoint.x}
        y={leftLabelPoint.y}
        textAnchor={same ? leftCardAnchor : "middle"}
        className="cardinality"
      >
        {leftLabel}
      </text>
      <text
        x={rightLabelPoint.x}
        y={rightLabelPoint.y}
        textAnchor={same ? rightCardAnchor : "middle"}
        className="cardinality"
      >
        {rightLabel}
      </text>
      {same &&
        r.roles?.map((role, index) => (
          <text
            key={"role:" + index}
            x={index === 0 ? (a.x + mx) / 2 : (a.x + mx) / 2}
            y={index === 0 ? a.y - 68 : a.y + 14}
            textAnchor="start"
            className="cardinality role-label"
          >
            {role}
          </text>
        ))}
      <polygon
        points={`${mx},${my - 39} ${mx + 39},${my} ${mx},${my + 39} ${mx - 39},${my}`}
        className="diamond"
        onDoubleClick={(event) => {
          event.stopPropagation();
          onEditRelation(r.id);
        }}
      />
      {(r.dependency === "ID" || r.dependency === "E") && (
        <>
          <line
            x1={mx - 23}
            y1={my - 15}
            x2={mx + 23}
            y2={my - 15}
            className="dependency-divider"
          />
          <text x={mx} y={my - 21} textAnchor="middle" className="dependency-mark">
            {r.dependency === "ID" ? "ID" : "EX"}
          </text>
        </>
      )}
      <text x={mx} y={my + 2} textAnchor="middle" className="relation-name">
        {(names[r.id] ?? r.name).slice(0, 13)}
      </text>
      <text x={mx} y={my - 47} textAnchor="middle" className="ratio">
        {ratio}
      </text>
      <RelationAttributeNodes
        attributes={r.attributes}
        relationName={r.name}
        centerX={mx}
        centerY={my}
        diamondRadius={39}
        onEditAttribute={onEditAttribute}
      />
    </g>
  );
}

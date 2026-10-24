import type { Relation } from "../../../model";
import type { WeakCardinality } from "../../../parser/ddlParser";

export function RelationPreview({
  left,
  right,
  participants,
  name,
  kind,
  weakCardinality,
  dependency,
  minima,
}: {
  left: string;
  right: string;
  participants: string[];
  name: string;
  kind: Relation["kind"];
  weakCardinality?: WeakCardinality;
  dependency?: string;
  minima: (0 | 1)[];
}) {
  const rightMax = weakCardinality
    ? weakCardinality.endsWith(":1")
      ? "1"
      : "n"
    : kind === "1:1"
      ? "1"
      : kind === "1:N"
        ? "n"
        : "n";
  const leftMax = weakCardinality ? "1" : kind === "1:N" ? "1" : kind === "1:1" ? "1" : "n";
  if (participants.length > 2) {
    const points = [
      { x: 300, y: 42 },
      { x: 520, y: 130 },
      { x: 420, y: 220 },
      { x: 180, y: 220 },
    ].slice(0, participants.length);
    return (
      <div className="diagram-kind-preview">
        <strong>Vista previa</strong>
        <svg
          viewBox="0 0 600 270"
          role="img"
          aria-label="Vista previa de interrelación con varios participantes"
        >
          {points.map((point, index) => (
            <g key={participants[index]}>
              <line x1="300" y1="140" x2={point.x} y2={point.y} className="draft-preview-edge" />
              <rect
                x={point.x - 66}
                y={point.y - 23}
                width="132"
                height="46"
                rx="4"
                className="draft-preview-entity"
              />
              <text
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="draft-preview-label"
              >
                {participants[index]}
              </text>
              <text
                x={(point.x + 300) / 2}
                y={(point.y + 140) / 2 - 8}
                className="draft-preview-label"
              >
                ({minima[index] ?? 0},n)
              </text>
            </g>
          ))}
          <polygon points="300,104 336,140 300,176 264,140" className="draft-preview-entity" />
          <text
            x="300"
            y="140"
            textAnchor="middle"
            dominantBaseline="middle"
            className="draft-preview-label"
          >
            {name.slice(0, 12)}
          </text>
          <text x="300" y="92" textAnchor="middle" className="draft-preview-label">
            N-aria
          </text>
        </svg>
      </div>
    );
  }
  return (
    <div className="diagram-kind-preview">
      <strong>Vista previa</strong>
      <svg viewBox="0 0 600 260" role="img" aria-label="Vista previa de la interrelación">
        <line x1="175" y1="135" x2="245" y2="135" className="draft-preview-edge" />
        <line x1="355" y1="135" x2="425" y2="135" className="draft-preview-edge" />
        <rect x="30" y="108" width="145" height="54" rx="4" className="draft-preview-entity" />
        <rect x="425" y="108" width="145" height="54" rx="4" className="draft-preview-entity" />
        <text
          x="102"
          y="136"
          textAnchor="middle"
          dominantBaseline="middle"
          className="draft-preview-label"
        >
          {left}
        </text>
        <text
          x="497"
          y="136"
          textAnchor="middle"
          dominantBaseline="middle"
          className="draft-preview-label"
        >
          {right}
        </text>
        <polygon points="300,80 355,135 300,190 245,135" className="draft-preview-entity" />
        {(dependency === "ID" || dependency === "E") && (
          <>
            <line x1="273" y1="108" x2="327" y2="108" className="draft-preview-edge" />
            <text x="300" y="103" textAnchor="middle" className="draft-preview-label">
              {dependency === "ID" ? "ID" : "EX"}
            </text>
          </>
        )}
        <text
          x="300"
          y="139"
          textAnchor="middle"
          dominantBaseline="middle"
          className="draft-preview-label"
        >
          {name || "Relación"}
        </text>
        <text x="300" y="60" textAnchor="middle" className="draft-preview-label">
          {weakCardinality ? leftMax + ":" + rightMax : kind}
        </text>
        <text x="210" y="119" textAnchor="middle" className="draft-preview-label">
          ({minima[0] ?? 1},{leftMax})
        </text>
        <text x="390" y="119" textAnchor="middle" className="draft-preview-label">
          ({minima[1] ?? 0},{rightMax})
        </text>
      </svg>
    </div>
  );
}

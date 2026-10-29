import { useState } from "react";
import { hierarchyGeometry } from "../hierarchyGeometry";

type Props = {
  supertype: string;
  subtypes: string[];
  availableEntities: string[];
  exclusive: boolean;
  total: boolean;
  onSupertypeChange: (name: string) => void;
  onSubtypeChange: (index: number, name: string) => void;
  onExclusiveChange: (exclusive: boolean) => void;
  onTotalChange: (total: boolean) => void;
};

export function HierarchyPreview({
  supertype,
  subtypes,
  availableEntities,
  exclusive,
  total,
  onSupertypeChange,
  onSubtypeChange,
  onExclusiveChange,
  onTotalChange,
}: Props) {
  const [extraSlots, setExtraSlots] = useState(0);
  const slotCount = Math.max(2, subtypes.length, extraSlots);
  const points = Array.from({ length: slotCount }, (_, index) => ({
    x: 300 + (index - (slotCount - 1) / 2) * Math.min(155, 460 / Math.max(slotCount - 1, 1)),
    y: 222,
  }));
  const labels = Array.from({ length: slotCount }, (_, index) => subtypes[index] ?? "");
  const geometry = hierarchyGeometry(
    { x: 300, y: 54, halfWidth: 80, halfHeight: 26 },
    points.map((point) => ({ x: point.x, y: point.y + 24, halfWidth: 66, halfHeight: 24 })),
    { radius: 9, stemLength: 74 },
  );
  const childLabelPoint = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    return {
      x: from.x + dx * 0.55 - (dy / length) * 12,
      y: from.y + dy * 0.55 + (dx / length) * 12,
    };
  };
  const subtypeOptions = (index: number) =>
    availableEntities.filter(
      (name) => name !== supertype && (!subtypes.includes(name) || subtypes[index] === name),
    );
  const availableSlotCount = Math.max(0, availableEntities.length - 1);

  return (
    <div className="diagram-kind-preview hierarchy-preview">
      <strong>Vista previa</strong>
      <svg
        viewBox="0 0 600 300"
        role="img"
        aria-label="Vista previa de jerarquía de generalización"
      >
        {geometry && (
          <>
            {total ? (
              geometry.doubleStem.map(([from, to], index) => (
                <line
                  key={`preview-stem:${index}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className="draft-preview-edge"
                />
              ))
            ) : (
              <line
                x1={geometry.stem[0].x}
                y1={geometry.stem[0].y}
                x2={geometry.stem[1].x}
                y2={geometry.stem[1].y}
                className="draft-preview-edge"
              />
            )}
            {geometry.childAnchors.map((anchor, index) => {
              const end = geometry.childLineEnds[index];
              const label = childLabelPoint(anchor, end);
              return (
                <g key={`preview-child:${index}`}>
                  <line
                    x1={anchor.x}
                    y1={anchor.y}
                    x2={end.x}
                    y2={end.y}
                    className="draft-preview-edge"
                  />
                  <text x={label.x} y={label.y} textAnchor="middle" className="draft-preview-label">
                    (0,1)
                  </text>
                </g>
              );
            })}
            {exclusive && <path d={geometry.arc} className="hierarchy-arc" />}
            <circle
              cx={geometry.connector.x}
              cy={geometry.connector.y}
              r={geometry.radius}
              className={total ? "hierarchy-circle total" : "hierarchy-circle"}
            />
            <text
              x={geometry.connector.x}
              y={geometry.connector.y + 3}
              textAnchor="middle"
              className={total ? "hierarchy-symbol total" : "hierarchy-symbol"}
            >
              {exclusive ? "d" : "o"}
            </text>
          </>
        )}
        <text x="318" y="105" className="draft-preview-label">
          (1,1)
        </text>
        <rect x="220" y="28" width="160" height="52" rx="4" className="draft-preview-entity" />
        <foreignObject x="220" y="28" width="160" height="52">
          <select
            className="hierarchy-preview-select supertype-select"
            aria-label="Elegir supertipo"
            value={supertype}
            onChange={(event) => onSupertypeChange(event.target.value)}
          >
            <option value="">Elegir supertipo</option>
            {availableEntities.map((name) => (
              <option key={name} value={name} disabled={subtypes.includes(name)}>
                {name}
              </option>
            ))}
          </select>
        </foreignObject>
        {points.map((point, index) => (
          <g key={index}>
            <rect
              x={point.x - 66}
              y={point.y}
              width="132"
              height="48"
              rx="4"
              className="draft-preview-entity"
            />
            <foreignObject x={point.x - 64} y={point.y + 2} width="128" height="44">
              <select
                className="hierarchy-preview-select subtype-select"
                aria-label={`Elegir subtipo ${index + 1}`}
                value={labels[index]}
                onChange={(event) => onSubtypeChange(index, event.target.value)}
              >
                <option value="">Elegir subtipo</option>
                {subtypeOptions(index).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </foreignObject>
          </g>
        ))}
      </svg>
      <button
        type="button"
        className="hierarchy-add-subtype"
        disabled={slotCount >= availableSlotCount}
        onClick={() => setExtraSlots((current) => Math.max(current, slotCount) + 1)}
      >
        ＋ Agregar subtipo
      </button>
      <div className="hierarchy-preview-controls">
        <div role="group" aria-label="Solapamiento de la jerarquía">
          <button type="button" aria-pressed={!exclusive} onClick={() => onExclusiveChange(false)}>
            Solapada
          </button>
          <button type="button" aria-pressed={exclusive} onClick={() => onExclusiveChange(true)}>
            Exclusiva
          </button>
        </div>
        <div role="group" aria-label="Cobertura de la jerarquía">
          <button type="button" aria-pressed={!total} onClick={() => onTotalChange(false)}>
            Parcial
          </button>
          <button type="button" aria-pressed={total} onClick={() => onTotalChange(true)}>
            Total
          </button>
        </div>
      </div>
    </div>
  );
}

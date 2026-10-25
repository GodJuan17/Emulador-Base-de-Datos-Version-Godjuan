import { useState } from "react";

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
  const arcStart = Math.max(50, points[0].x - 66);
  const arcEnd = Math.min(550, points[points.length - 1].x + 66);
  const arcPath = [`M${arcStart} 207`, "Q300 286", `${arcEnd} 207`].join(" ");
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
        <line x1="300" y1="80" x2="300" y2="126" className="draft-preview-edge" />
        <text x="322" y="105" className="draft-preview-label">
          (1,1)
        </text>
        <circle cx="300" cy="125" r="6" className="draft-preview-node outline" />
        <path d="M270 144 L330 144 L300 180 Z" className="draft-preview-entity" />
        {points.map((point, index) => (
          <g key={index}>
            <line
              x1={
                300 +
                (index - (points.length - 1) / 2) *
                  Math.min(34, 80 / Math.max(points.length - 1, 1))
              }
              y1="144"
              x2={point.x}
              y2="194"
              className="draft-preview-edge"
            />
            <text x={point.x} y="187" textAnchor="middle" className="draft-preview-label">
              (0,1)
            </text>
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
        {exclusive && <path d={arcPath} className="hierarchy-arc" />}
        {total && <circle cx="300" cy="124" r="9" className="hierarchy-total" />}
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
